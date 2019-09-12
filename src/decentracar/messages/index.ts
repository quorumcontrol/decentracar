/// <reference path="../../@types/ipld-dag-cbor/index.d.ts" />

import dagCBOR from 'ipld-dag-cbor'

/**
 * These would probably be better served as protobufs, but for demo purposes, I think it's clearer to just use Plain Old Javascript Objects
 */


export namespace Messages {

    export function serialize(msg:any):Uint8Array{
        return dagCBOR.util.serialize(msg)
    }

    export function deserialize(bits:Uint8Array):any{
        return dagCBOR.util.deserialize(bits)
    }
 
    export interface didRegistration {
        type: "didRegistration"
        did:string
    }
}

export default Messages
