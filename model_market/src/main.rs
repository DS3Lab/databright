extern crate ini;
extern crate csv;
extern crate tokio_core;
extern crate web3;

use ini::Ini;
use std::collections::HashMap;
use web3::contract::{Contract, Options};
use web3::types::{Address, FilterBuilder, BlockNumber, H256};
use web3::futures::{Future, Stream};
use std::time;

fn main() {

    // Extract configuration from config.ini
    let conf = Ini::load_from_file("config.ini").unwrap();
    let contracts_section = conf.section(Some("Contracts".to_owned())).unwrap();
    let contracts = contracts_section.get("contracts").unwrap();
    let database_association_address: Address = contracts_section.get("DatabaseAssociation").unwrap().parse().unwrap();
    
    let web3_section = conf.section(Some("Web3".to_owned())).unwrap();
    let ws_url = web3_section.get("websocket_transport_url").unwrap();
    let last_processed_block_id = web3_section.get("last_processed_block_id").unwrap();

    let contract_path = "../data_market/build/";

    // Populate topic hashmap
    let mut topics: HashMap<(&str, String), H256> = HashMap::new();
    for contract in contracts.split(",") {
        let mut rdr = csv::Reader::from_path(format!("../data_market/build/{}.topic", contract)).unwrap();
        
        for rec in rdr.records() {
            let rr = rec.unwrap();
            let event_name = rr.get(0).unwrap();
            let topic_hash = rr.get(1).unwrap();
            let topic_bytes = H256::from(topic_hash.as_bytes());
            topics.insert((contract, event_name.to_owned()), topic_bytes);
        }
    }


    // Connect to ethereum node
    let mut event_loop = tokio_core::reactor::Core::new().unwrap();
    let handle = event_loop.handle();
    let transp = web3::transports::WebSocket::with_event_loop(ws_url, &handle).unwrap();
    let web3 = web3::Web3::new(transp);

    // Retrieve logs since last processed block
    let desired_topic = topics.get(&("DatabaseAssociation", "ProposalAdded".into())).unwrap();
    let from_block = if last_processed_block_id.is_empty() { 
            BlockNumber::Earliest
        } else {
            match last_processed_block_id.parse::<u64>() {
                Ok(n) => BlockNumber::Number(n),
                Err(err) => {println!("Couldn't parse last_processed_block_id from configuration. Starting from earliest block..."); BlockNumber::Earliest },
            }
        };

    let filter = FilterBuilder::default()
        .address(vec![database_association_address])
        .from_block(from_block)
        .to_block(BlockNumber::Latest)
        .topics(
            Some(vec![
                *desired_topic,
            ]),
            None,
            None,
            None,
        )
        .build();

    let event_future = web3.eth_filter()
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
        .map_err(|_| ());
}