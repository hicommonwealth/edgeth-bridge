extern crate rustc_hex;
extern crate tokio_core;
extern crate web3;
extern crate serde_json;


use std::time;
use rustc_hex::FromHex;
use web3::contract::{Contract, Options};
use web3::futures::{Future, Stream};
use web3::types::FilterBuilder;
use web3::transports::Http;

fn build_filter(contract: &Contract<Http>, func_hash: web3::types::H256) -> web3::types::Filter {
    // Filter for Hello event in our contract
    FilterBuilder::default()
        .address(vec![contract.address()])
        .topics(
            Some(vec![func_hash]),
            None,
            None,
            None,
        )
        .build() 
}

fn main() {
    let mut eloop = tokio_core::reactor::Core::new().unwrap();
    let web3 = web3::Web3::new(web3::transports::Http::with_event_loop("http://localhost:8545", &eloop.handle(), 1).unwrap());

    // Get the contract bytecode for instance from Solidity compiler
    let bytecode: Vec<u8> = include_str!("./compiled/SimpleEvent.bin").from_hex().unwrap();

    let event_future = |filter| {
        web3.eth_filter()
            .create_logs_filter(filter)
            .then(|filter| {
                filter
                    .unwrap()
                    .stream(time::Duration::from_secs(0))
                    .for_each(|log| {
                        println!("got log: {:?}", log);
                        Ok(())
                    })
            })
            .map_err(|_| ())
    };


    eloop.run(web3.eth().accounts().then(|accounts| {
        let accounts = accounts.unwrap();

        Contract::deploy(web3.eth(), include_bytes!("./compiled/SimpleEvent.abi"))
            .unwrap()
            .confirmations(0)
            .poll_interval(time::Duration::from_secs(10))
            .options(Options::with(|opt| {
                opt.gas = Some(3_000_000.into())
            }))
            .execute(bytecode, (), accounts[0])
            .unwrap()
            .then(move |contract| {
                println!("{:?}", contract);
                let contract = contract.unwrap();

                let filter = build_filter(
                    &contract,
                    "0xd282f389399565f3671145f5916e51652b60eee8e5c759293a2f5771b8ddfd2e".into());

                let call_future = contract
                    .call("hello", (), accounts[0], Options::default())
                    .then(|tx| {
                        println!("got tx: {:?}", tx);
                        Ok(())
                    });

                (event_future(filter)).join(call_future)
            })
    })).unwrap();
}
