declare module 'ipld-dag-cbor' {
    interface util {
        serialize(obj:Any):Uint8Array
        deserialize(encoded:Uint8Array|string):Any
    }

    export default {
        util: util
    }
}