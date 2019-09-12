
import { Community } from 'tupelo-wasm-sdk';
import debug from 'debug';

const log = debug("appcommunity")

let _appPromise:Promise<Community>

export function getAppCommunity(): Promise<Community> {
   log("getAppCommunity")
   if (_appPromise !== undefined) {
       return _appPromise
   }
    _appPromise = new Promise(async (resolve,reject)=> {
        const c = await Community.freshLocalTestCommunity()
        resolve(c)
    })
    return _appPromise
}
