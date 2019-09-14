import { EcdsaKey, ChainTree, Community, CommunityMessenger, Tupelo, setDataTransaction } from 'tupelo-wasm-sdk';
import faker from 'faker';
import Vector from '../util/vector'
import { EventEmitter } from 'events';
import debug from 'debug';
import { minLong, maxLong, minLat, maxLat } from '../util/locations';
import { Rider } from '../rider';
import { Envelope } from 'tupelo-wasm-sdk/node_modules/tupelo-messages';
import Messages, { certificationTopic, ridersTopic, messageType } from '../messages';
import { SimpleSyncher } from '../util/actor';

const log = debug('decentracar:driver')

const MAX_SPEED = .000533,
    MIN_SPEED = .000016,
    MAX_FORCE = .0001

interface IDriverOpts {
    community: Promise<Community>
    location: Vector
}

export class Driver extends EventEmitter {
    community: Promise<Community>
    tree?: ChainTree
    key?: EcdsaKey
    id?: string
    name: string
    location: Vector
    velocity: Vector
    acceleration: Vector
    wandering: Vector

    riderLocation?: Vector
    acceptedRider?: string
    destination?: Vector
    offering: boolean
    registered: boolean

    private messenger?: CommunityMessenger
    private startPromise?: Promise<Driver>
    private syncher:SimpleSyncher

    constructor(opts: IDriverOpts) {
        super();
        this.community = opts.community;
        this.location = opts.location;
        this.velocity = new Vector(0, 0);
        this.acceleration = new Vector(0, 0);
        this.wandering = new Vector(.0001, .0001);
        this.name = faker.name.findName();
        this.registered = false;
        this.offering = false;
        this.syncher = new SimpleSyncher();
    }

    start() {
        if (this.startPromise !== undefined) {
            return this.startPromise
        }
        this.startPromise = new Promise(async (resolve, reject) => {
            const community = await this.community
            this.key = await EcdsaKey.generate()
            this.tree = await ChainTree.newEmptyTree(community.blockservice, this.key)
            const id = await this.tree.id()
            if (id === null) {
                reject(new Error("error getting id"))
                return
            }
            this.id = id
            this.messenger = new CommunityMessenger("integrationtest", 32, this.key, Buffer.from(this.id, 'utf8'), community.node.pubsub)
            this.messenger.subscribe(this.id, this.handleSelfMessages.bind(this))
            this.messenger.subscribe(ridersTopic, this.handleRidersMessage.bind(this))
            await this.registerAsDriver()
            log(this.name, " starting at ", this.location)
            resolve(this)
        })
        return this.startPromise
    }

    async registerAsDriver() {
        if (this.messenger === undefined || this.tree === undefined) {
            throw new Error("need a tree and messenger to registerAsDriver")
        }
        const c = await this.community
        await c.playTransactions(this.tree, [setDataTransaction("_decentracar/type", "driver")])
        await c.nextUpdate()
        this.messenger.publish(certificationTopic, Messages.serialize({
            type: messageType.didRegistration,
            did: this.id,
        } as Messages.didRegistration))
    }

    async handleRidersMessage(env: Envelope) {
        if (this.offering) {
            return // ignore other messages for now
        }
        if (this.messenger === undefined || this.tree === undefined || this.id === undefined) {
            throw new Error("need an id, tree and messenger to registerAsDriver")
        }
        // TODO: make a decision if the car should offer or not
        this.offering = true
        const c = await this.community
        await c.playTransactions(this.tree, [setDataTransaction("_decentracar/offering", Buffer.from(env.getFrom_asU8()).toString())])
        log(this.name, " offering a ride")

        const msg: Messages.rideRequest = Messages.deserialize(env.getPayload_asU8())

        this.messenger.publish(Buffer.from(env.getFrom_asU8()).toString(), Messages.serialize({
            type: messageType.offer,
            driverDid: this.id,
            driverLocation: [this.location.x, this.location.y],
        } as Messages.offer))
    }

    async handleSelfMessages(env: Envelope) {
        if (this.messenger === undefined || this.tree === undefined || this.id === undefined) {
            throw new Error("need an id, tree and messenger to handleSelfMessages")
        }
        const msg: Messages.dcMessage = Messages.deserialize(env.getPayload_asU8())
        switch (msg.type) {
            case messageType.didRegistration:
                this.registered = true // for now, for real we'd have to check this
                log(this.name, " registered")
                break;
            case messageType.offerReject:
                log(this.name, " offer rejected by rider")
                // TODO: check if this is a valid offer, and was sent by us and we still care about it
                this.riderLocation = undefined
                this.acceptedRider = undefined
                this.offering = false
                break;
            case messageType.offerAccept:
                const typedMsg = <Messages.offerAccept>msg
                log(this.name, " offer accepted by rider")
                //TODO: check if this is a valid accept
                this.acceptedRider = typedMsg.riderDid
                this.riderLocation = new Vector(typedMsg.location[0], typedMsg.location[1])
                const c = await this.community
                this.syncher.send(()=> {
                    if (this.tree === undefined) {
                        throw new Error("undefined tree")
                    }
                    c.playTransactions(this.tree, [setDataTransaction("/_decentracar/accepted", typedMsg.riderDid)])
                })
                break;
        }
    }

    async tick() {
        await this.start()
        // do all the calculations
        if (this.riderLocation !== undefined) {
            var d = this.riderLocation.dist(this.location);
            log(this.name, " @ ", this.location, " moving to rider @ ", this.riderLocation, " (distance: ", d, ", accepted: ", !!this.acceptedRider, ")")
            this.follow(this.riderLocation, .001) //TODO: not sure what the arrival number should be
        } else {
            this.emit('wandering')
            this.wander() // for now just wander
        }

        this.update()
    }

    wander() {
        if (Math.random() < .05) {
            this.wandering.rotate(Math.PI * 2 * Math.random());
        }
        // log(this.name, " wandering @ ", this.location)
        this.velocity.add(this.wandering);
    }

    follow(target: Vector, arrive: number) {
        var dest = target.copy().sub(this.location);
        var d = target.dist(this.location);

        if (d < arrive) {
            log(this.name, " arrived at passenger")
            dest.setMag(d / arrive * MAX_SPEED);
        } else {
            dest.setMag(MAX_SPEED);
        }

        

        this.applyForce(dest.limit(MAX_FORCE * 2));
    }

    // boundaries() {
    //     if (this.location.x < minLong)
    //         this.applyForce(new Vector(MAX_FORCE * 3, 0));

    //     if (this.location.x > maxLong)
    //         this.applyForce(new Vector(MAX_FORCE * 3, 0));

    //     if (this.location.y < minLat)
    //         this.applyForce(new Vector(0, MAX_FORCE * 3));

    //     if (this.location.y > maxLat)
    //         this.applyForce(new Vector(0, -MAX_FORCE * 3));
    // }

    applyForce(f: Vector) {
        this.acceleration.add(f);
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(MAX_SPEED);
        if (this.velocity.mag() < MIN_SPEED) {
            this.velocity.setMag(MIN_SPEED);
        }
        this.location.add(this.velocity);

        // reset acceleration
        this.acceleration.mul(0);
    }
}