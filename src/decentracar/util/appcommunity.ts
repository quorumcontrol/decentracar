
import { Community } from 'tupelo-wasm-sdk';
import debug from 'debug';

const log = debug("appcommunity")

let didSetDefault = false

export async function getAppCommunity(): Promise<Community> {
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
