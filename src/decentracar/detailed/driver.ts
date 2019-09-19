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
    // Validity checks:
    // * rider doing the offering is registered with Decentracar
    // * rider has modified their ChainTree to ask for a ride
    // * rider does not have an accepted driver in their chaintree
    return true
 });

 fsm.go(Driver.Offering, {test: true})