import { EcdsaKey, ChainTree, Community, CommunityMessenger, Tupelo, setDataTransaction } from 'tupelo-wasm-sdk';
import faker from 'faker';
import Vector from '../util/vector'
import { EventEmitter } from 'events';
import debug from 'debug';
import { minLong, maxLong, minLat, maxLat } from '../util/locations';
import { Rider } from '../rider';
import { Envelope } from 'tupelo-wasm-sdk/node_modules/tupelo-messages';
import { certificationTopic, ridersTopic, messageType, serialize, dropoff, riding, rideRequest, deserialize, offer, dcMessage, offerAccept, didRegistration } from '../messages';
import { SimpleSyncher } from '../util/actor';

const log = debug('decentracar:driver')

const MAX_SPEED = .001,
    MIN_SPEED = .000016,
    MAX_FORCE = .0001,
    ARRIVAL_DIST = .001

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
    hasRider:boolean
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
        this.hasRider = false;
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
        this.messenger.publish(certificationTopic, serialize({
            type: messageType.didRegistration,
            did: this.id,
        } as didRegistration))
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

        const msg: rideRequest = deserialize(env.getPayload_asU8())

        this.messenger.publish(Buffer.from(env.getFrom_asU8()).toString(), serialize({
            type: messageType.offer,
            driverDid: this.id,
            driverLocation: [this.location.x, this.location.y],
        } as offer))
    }

    async handleSelfMessages(env: Envelope) {
        if (this.messenger === undefined || this.tree === undefined || this.id === undefined) {
            throw new Error("need an id, tree and messenger to handleSelfMessages")
        }
        const msg: dcMessage = deserialize(env.getPayload_asU8())
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
                const typedMsg = <offerAccept>msg
                log(this.name, " offer accepted by rider")
                //TODO: check if this is a valid accept
                this.acceptedRider = typedMsg.riderDid
                this.riderLocation = new Vector(typedMsg.location[0], typedMsg.location[1])
                this.destination = new Vector(typedMsg.destination[0], typedMsg.destination[1])
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
        if (this.riderLocation !== undefined && !this.hasRider) {
            var d = this.riderLocation.dist(this.location);
            if (d < ARRIVAL_DIST) {
                log(this.name, " arrived at passenger")
                this.hasRider = true
            }
            log(this.name, " moving to rider @ ", this.riderLocation, " (distance: ", d, ")")
            this.follow(this.riderLocation, ARRIVAL_DIST) //TODO: not sure what the arrival number should be
        } else if (this.hasRider && this.destination) {
            if (!this.acceptedRider || !this.messenger) {
                throw new Error("error must have accepted rider if dropping someone off")
            }
            var d = this.destination.dist(this.location);
            log(this.name, " driving rider to ", this.destination, " (distance: ", d, ")")
            if (d < ARRIVAL_DIST) {
                log(this.name, " arrived at destination")
                this.hasRider = false
                this.riderLocation = undefined
                const c = await this.community
                await this.syncher.send(()=> {
                    if (this.tree === undefined) {
                        throw new Error("undefined tree")
                    }
                    return c.playTransactions(this.tree, [
                        setDataTransaction("/_decentracar/offering", null),
                        setDataTransaction("/_decentracar/accepted", null),
                    ])
                })
                this.messenger.publish(this.acceptedRider, serialize({
                    type: messageType.dropoff,
                    driverDid: this.id,
                } as dropoff))

                this.acceptedRider = undefined
                this.offering = false

                this.wander()
            } else {
                this.messenger.publish(this.acceptedRider, serialize({
                    type: messageType.riding,
                    driverDid: this.id,
                    location: [this.location.x, this.location.y],
                } as riding))
                this.follow(this.destination, ARRIVAL_DIST) //TODO: not sure what the arrival number should be
            }
           

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