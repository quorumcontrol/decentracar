
import {Community, Repo} from 'tupelo-wasm-sdk';
import debug from 'debug';

const log = debug("appcommunity")

const MemoryDatastore: any = require('interface-datastore').MemoryDatastore;

let didSetDefault = false

export namespace AppCommunity {
    export async function get():Promise<Community> {
        if (!didSetDefault) {
            log("getting fresh community")
            const c = await Community.freshLocalTestCommunity()
            log("setting default")
            Community.setDefault(c)
            didSetDefault = true
        }
        log("returning getDefault")
        return Community.getDefault()
    }
}

export default AppCommunity