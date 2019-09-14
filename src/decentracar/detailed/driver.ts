import {typestate} from 'typestate'

enum Driver {
    Wandering,
    Offering,
    Accepted,
    Riding,
    AcceptingPayment,
}

let fsm = new typestate.FiniteStateMachine<Driver>(Driver.Wandering);

fsm.from(Driver.Wandering).to(Driver.Offering)
fsm.from(Driver.Offering).to(Driver.Wandering)
fsm.from(Driver.Offering).to(Driver.Accepted)
fsm.from(Driver.Accepted).to(Driver.Riding)
fsm.from(Driver.Riding).to(Driver.AcceptingPayment)
fsm.from(Driver.AcceptingPayment).to(Driver.Wandering)

fsm.onEnter(Driver.Offering, (from?: Driver, evt?:any):boolean=>{
    // check to make sure the event doing this is a valid rider
    console.log('evt: ', evt, ' from: ', from)
    return true
 });

 fsm.go(Driver.Offering, {test: true})