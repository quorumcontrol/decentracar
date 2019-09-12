import {EcdsaKey, ChainTree, IPubSubMessage, Community, CommunityMessenger, CID} from 'tupelo-wasm-sdk';
import {Envelope} from 'tupelo-messages/community/community_pb'
import { DecentraCarService } from './service';
import debug from 'debug'
import { getAppCommunity } from '../util/appcommunity';

var log = debug("decentracar:index")

const topic = 'decentracar-certifications'

const doRun = async () => {
    log("doRun")
    let c = await getAppCommunity()
    log("got community")
    let key = await EcdsaKey.generate()
    let tree = await ChainTree.newEmptyTree(c.blockservice, key)
    const id = await tree.id()
    if (id === null) {
        throw new Error("unknown tree id")
    }
    const serv = new DecentraCarService({
        community: c,
        key: key,
        did: id,
    })
    log("starting service")
    await serv.start()
    return "running"
}

doRun().then((res) => {
    console.log("doRun finished: ", res)
}, (err)=> {
    console.error("error: ", err)
})