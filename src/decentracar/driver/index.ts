import { EcdsaKey, ChainTree, Community, CommunityMessenger, Tupelo } from 'tupelo-wasm-sdk';
import faker from 'faker';
import Vector from '../util/vector'
import { EventEmitter } from 'events';
import debug from 'debug';
import {getAppCommunity} from '../util/appcommunity';
import {randomGeo, mapCenter} from '../util/locations';

const log = debug('driver')

const MAX_SPEED = .00833, // approximately 100km per degree so 50km/h, in seconds,  is approximately (50*(1/100))/60  
      MIN_SPEED =  .00016, // approximately 100km per degree so 10km/h, in seconds,  is approximately (10*(1/100))/60  
	  MAX_FORCE = .0001

interface IDriverOpts {
    community:Community
    location: Vector
}

export class Driver extends EventEmitter {
    community:Community
    tree?:ChainTree
    key?:EcdsaKey
    id?:string
    private messenger?:CommunityMessenger
    private name?:string
    location:Vector
    velocity:Vector
    acceleration:Vector
    wandering:Vector

    constructor(opts:IDriverOpts) {
        super()
        this.community = opts.community
        this.location = opts.location
        this.velocity = new Vector(0, 0);
        this.acceleration = new Vector(0, 0);
        this.wandering = new Vector(.0001,.0001);
    }

    async start() {
        log("starting driver at ", this.location)
        this.key = await EcdsaKey.generate()
        this.id = await Tupelo.ecdsaPubkeyToDid(this.key.publicKey)
        this.messenger = new CommunityMessenger("integrationtest", 32, this.key, Buffer.from(this.id, 'utf8'), this.community.node.pubsub)
        this.name = faker.name.findName();
    }

    tick() {
        // do all the calculations
        this.wander() // for now just wander
        this.update()
    }

    wander() {
		if (Math.random() < .05) {
            this.wandering.rotate(Math.PI * 2 * Math.random());
        }
        log("this.wandering: ", this.wandering)
		this.velocity.add(this.wandering);
    }

    //TODO:
    // boundaries() {
	// 	if (this.location.x < 50)
	// 		this.applyForce(new Vector(this.maxforce*3, 0));

	// 	if (this.location.x > sea.width - 50)
	// 		this.applyForce(new Vector(-this.maxforce*3, 0));

	// 	if (this.location.y < 50)
	// 		this.applyForce(new Vector(0, this.maxforce*3));

	// 	if (this.location.y > sea.height - 50)
	// 		this.applyForce(new Vector(0, -this.maxforce*3));
	// }

    update() {
		this.velocity.add(this.acceleration);
	    this.velocity.limit(MAX_SPEED);
	    if(this.velocity.mag() < MIN_SPEED) {
            this.velocity.setMag(MIN_SPEED);
        }
        log("velocity: ", this.velocity)
	    this.location.add(this.velocity);

	    // reset acceleration
        this.acceleration.mul(0);
        log("new location: ", this.location)
	}
}

const doRun = async ()=> {
    const c = await getAppCommunity()
    const rndLoc = randomGeo(mapCenter, 1000) //supposed to be 1km away
    const d = new Driver({
        community: c,
        location: rndLoc,
    })
    await d.start()
    setInterval(()=> {
        d.tick()
    }, 1000)
}

// const topic = 'decentracar-certifications'

// const doRun = async () => {
//     let c = await Community.freshLocalTestCommunity()
//     let key = await EcdsaKey.generate()
//     let tree = await ChainTree.newEmptyTree(c.blockservice, key)
//     await c.playTransactions(tree, [setDataTransaction("_decentracar/type", "driver")])
//     const id = await tree.id()
//     if (id === null) {
//         throw new Error("unknown tree id")
//     }
//     console.log("id: ", id)

//     const messenger = new CommunityMessenger("integrationtest", 32, key, Buffer.from(id, 'utf8'), c.node.pubsub)


//     await messenger.publish(topic, Buffer.from(id,'utf8'))
//     // c.node.pubsub.subscribe(topic, async (msg: IPubSubMessage) => {
//     //     const obj = dagCBOR.utils.deserialize(msg.data)
//     //     console.log("received: ", obj)
//     //     let tip = c.getTip(obj)
//     //     let tree = new ChainTree({
//     //         tip: tip,
//     //         store: c.blockservice,
//     //     })
//     //     let type = await tree.resolve("/tree/data/_decentracar/type".split("/"))
//     //     switch (<string>type.value) {
//     //         case "driver":
//     //             console.log("driver assertion!");
//     //         case "passenger":
//     //             console.log("passenger assertion");
//     //     }
//     // })
//     return "published"
// }

doRun().then((res) => {
    console.log("doRun finished: ", res)
}, (err)=> {
    console.error("error: ", err)
})