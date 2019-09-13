import {Simulation} from './simulation'
import { getAppCommunity } from './util/appcommunity'

let sim:Simulation

async function doRun() {
    const c = getAppCommunity()
    const sim = new Simulation({
        driverCount: 5,
        riderProbability: 50,
        community: c
    })
    sim.on('tick', (num:number) => {
        console.log('---- tick ', num, ' -----')
    })
    await sim.start()
    sim.tickEvery(1000)
}

doRun().then((resp)=> {
    console.log(resp)
},(err:Error) => {
    console.error("error: ", err)
})