extern crate ini;
extern crate csv;
extern crate tokio_core;
extern crate web3;

use ini::Ini;
use std::collections::HashMap;
use web3::contract::Contract;
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
    let replay_past_events = {
        let replay_string = web3_section.get("replay_past_events").unwrap();
        match replay_string.parse::<bool>() {
            Ok(b) => b,
            Err(_) => {println!("Couldn't parse replay_past_events from configuration. Replaying events from the past.."); true },
        }
    };

    let last_processed_block_id = web3_section.get("last_processed_block_id").unwrap();

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

    // Print accounts and balance to check if websocket connection works
    let accounts = web3.eth().accounts().map(|accounts| {
        println!("Accounts: {:?}", accounts);
        accounts[0]
	});

	let my_acc = event_loop.run(accounts).unwrap();
	let bal = web3.eth().balance(my_acc, None).map(|balance| {
		println!("Balance of {}: {}", my_acc, balance);
	});
    event_loop.run(bal).unwrap();

    let database_association_contract = Contract::from_json(
        web3.eth(),
        database_association_address,
        include_bytes!("../../data_market/build/DatabaseAssociation.abi"),
    ).unwrap();

    // Retrieve logs since last processed block

    // TODO To filter for specific events, like the Voted-event of DatabaseAssociation:
    // let desired_topics = Some(vec![*topics.get(&("DatabaseAssociation", "Voted".into())).unwrap()]);
    let desired_topics = None;

    if replay_past_events {
        let from_block = if last_processed_block_id.is_empty() {
                BlockNumber::Earliest
            } else {
                match last_processed_block_id.parse::<u64>() {
                    Ok(n) => BlockNumber::Number(n),
                    Err(_) => {println!("Couldn't parse last_processed_block_id from configuration. Starting from earliest block..."); BlockNumber::Earliest },
                }
            };

        let filter = FilterBuilder::default()
            .address(vec![database_association_contract.address()])
            .from_block(from_block)
            .to_block(BlockNumber::Latest)
            .topics(
                desired_topics,
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
                        // TODO Handle filtered log here
                        Ok(())
                    })
            })
            .map_err(|_| ());

        event_loop.run(event_future);
    }
}