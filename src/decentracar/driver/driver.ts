import { EcdsaKey, ChainTree, setDataTransaction, Community, CommunityMessenger } from 'tupelo-wasm-sdk';

const topic = 'decentracar-certifications'

const doRun = async () => {
    let c = await Community.freshLocalTestCommunity()
    let key = await EcdsaKey.generate()
    let tree = await ChainTree.newEmptyTree(c.blockservice, key)
    await c.playTransactions(tree, [setDataTransaction("_decentracar/type", "driver")])
    const id = await tree.id()
    if (id === null) {
        throw new Error("unknown tree id")
    }
    console.log("id: ", id)

    const messenger = new CommunityMessenger("integrationtest", 32, key, Buffer.from(id, 'utf8'), c.node.pubsub)


    await messenger.publish(topic, Buffer.from(id,'utf8'))
    // c.node.pubsub.subscribe(topic, async (msg: IPubSubMessage) => {
    //     const obj = dagCBOR.utils.deserialize(msg.data)
    //     console.log("received: ", obj)
    //     let tip = c.getTip(obj)
    //     let tree = new ChainTree({
    //         tip: tip,
    //         store: c.blockservice,
    //     })
    //     let type = await tree.resolve("/tree/data/_decentracar/type".split("/"))
    //     switch (<string>type.value) {
    //         case "driver":
    //             console.log("driver assertion!");
    //         case "passenger":
    //             console.log("passenger assertion");
    //     }
    // })
    return "published"
}

doRun().then((res) => {
    console.log("doRun finished: ", res)
}, (err)=> {
    console.error("error: ", err)
})