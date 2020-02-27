/// <reference path="../../@types/ipld-dag-cbor/index.d.ts" />
/* eslint-disable */

import dagCBOR from 'ipld-dag-cbor'
import { IPubSub } from "tupelo-wasm-sdk";

/**
 * These would probably be better served as protobufs, but for demo purposes, I think it's clearer to just use Plain Old Javascript Objects
 */

export const certificationTopic = 'decentracar-certifications'
export const driverLocationTopic = 'decentracar-drivers'
export const ridersTopic = 'decentracar-riders'

export enum messageType {
    offer,
    offerReject,
    offerAccept,
    didRegistration,
    rideRequest,
    rideRequestResponse,
    riding,
    dropoff,
}


export function serialize(msg: any): Uint8Array {
    return dagCBOR.util.serialize(msg)
}

export function deserialize(bits: Uint8Array): any {
    return dagCBOR.util.deserialize(bits)
}

export interface dcMessage {
    type: messageType
    from: Uint8Array
}

export interface offer extends dcMessage {
    type: messageType.offer
    driverDid: string
    driverLocation: [number, number]
}

export interface didRegistration extends dcMessage {
    type: messageType.didRegistration
    did: string
}

export interface rideRequest extends dcMessage {
    type: messageType.rideRequest
    riderDID: string
    location: [number, number]
}

export interface rideRequestResponse extends dcMessage {
    type: messageType.rideRequestResponse
    driverDID: string
    location: [number, number]
}

export interface offerReject extends dcMessage {
    type: messageType.offerReject
    offer: offer
}

export interface offerAccept extends dcMessage {
    type: messageType.offerAccept
    riderDid: string
    location: [number, number]
    destination: [number, number]
}

export interface riding extends dcMessage {
    type: messageType.riding
    driverDid: string
    location: [number, number]
}

export interface dropoff extends dcMessage {
    type: messageType.dropoff,
    driverDid: string
}

export class Messenger {
    private pubsub: IPubSub

    constructor(pubsub: IPubSub) {
        this.pubsub = pubsub
    }

    async publish(topic: string, payload: Uint8Array) {
        return new Promise(async (resolve, reject) => {
            try {
                this.pubsub.publish(topic, payload, (err?: Error) => {
                    if (err === undefined) {
                        reject(err)
                        return
                    }

                    resolve()
                })
            } catch (e) {
                reject(e)
            }
        })
    }

    async subscribe(topic: string, subscriber: Function) {
        return new Promise(async (resolve, reject) => {
            this.pubsub.subscribe(topic, subscriber, (err?: Error) => {
                if (err !== undefined) {
                    reject(err)
                    return
                }

                resolve()
            })
        })
    }

    async unsubscribe(topic: string, subscriber: Function) {
        return new Promise(async (resolve, reject) => {
            this.pubsub.unsubscribe(topic, subscriber, resolve)
        })
    }
}
