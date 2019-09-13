/// <reference path="../../@types/ipld-dag-cbor/index.d.ts" />

import dagCBOR from 'ipld-dag-cbor'

/**
 * These would probably be better served as protobufs, but for demo purposes, I think it's clearer to just use Plain Old Javascript Objects
 */

export const certificationTopic = 'decentracar-certifications'
export const driverLocationTopic = 'decentracar-drivers'
export const ridersTopic = 'decentracar-riders'

export namespace Messages {

    export function serialize(msg:any):Uint8Array{
        return dagCBOR.util.serialize(msg)
    }

    export function deserialize(bits:Uint8Array):any{
        return dagCBOR.util.deserialize(bits)
    }

    export interface dcMessage {
        type:string
    }
 
    export interface offer extends dcMessage {
        type: "offer"
        driverDid: string
        driverLocation: [number,number]
    }

    export interface didRegistration extends dcMessage {
        type: "didRegistration"
        did:string
    }

    export interface rideRequest extends dcMessage {
        type: "rideRequest"
        riderDID:string
        location:[number,number]
    }

    export interface rideRequestResponse extends dcMessage {
        type: "rideRequestResponse"
        driverDID:string
        location:[number,number]
    }
}

export default Messages
