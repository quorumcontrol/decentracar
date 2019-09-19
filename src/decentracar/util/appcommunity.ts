
import { Community } from 'tupelo-wasm-sdk';
import debug from 'debug';
import process from 'process'

const log = debug("appcommunity")

let _appPromise: Promise<Community>

export function getAppCommunity(): Promise<Community> {
    log("getAppCommunity")
    if (_appPromise !== undefined) {
        return _appPromise
    }
    _appPromise = new Promise(async (resolve, reject) => {
        let c: Community
        switch (process.env.NODE_ENV) {
            case 'production':
                c = await Community.getDefault()
                break;
            default:
                c = await Community.freshLocalTestCommunity()
        }
        resolve(c)
    })
    return _appPromise
}
