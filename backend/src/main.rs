extern crate ini;
extern crate csv;
extern crate tokio_core;
extern crate web3;
#[macro_use] extern crate log;
extern crate env_logger;
extern crate ipfsapi;

use ini::Ini;
use std::collections::HashMap;
use web3::contract::Contract;
use web3::types::{Address, FilterBuilder, BlockNumber, H256};
use web3::futures::{Future, Stream};
use ipfsapi::IpfsApi;
fn main() {

    env_logger::init();

    // Extract configuration from config.ini
    info!("Extracting configuration from config.ini..");
    let conf = Ini::load_from_file("config.ini").unwrap();
    let contracts_section = conf.section(Some("Contracts".to_owned())).unwrap();
    let contracts = contracts_section.get("contracts").unwrap();
    let database_association_address: Address = contracts_section.get("DatabaseAssociation").unwrap().parse().unwrap();
    debug!("Contracts to use: {}", contracts);
    debug!("DatabaseAssociation to use: {}", database_association_address);

    let web3_section = conf.section(Some("Web3".to_owned())).unwrap();
    let ws_url = web3_section.get("websocket_transport_url").unwrap();
    let replay_past_events = {
        let replay_string = web3_section.get("replay_past_events").unwrap();
        match replay_string.parse::<bool>() {
            Ok(b) => b,
            Err(_) => {println!("Couldn't parse replay_past_events from configuration. Skipping events from the past.."); false },
        }
    };
    let subscribe_future_events = {
        let subscribe_string = web3_section.get("subscribe_future_events").unwrap();
        match subscribe_string.parse::<bool>() {
            Ok(b) => b,
            Err(_) => {println!("Couldn't parse subscribe_future_events from configuration. Not subscribing to future events.."); false },
        }
    };
    let last_processed_block_id = web3_section.get("last_processed_block_id").unwrap();

    let ipfs_section = conf.section(Some("Ipfs".to_owned())).unwrap();
    let ipfs_node_ip = ipfs_section.get("node_ip").unwrap();
    let ipfs_node_port = ipfs_section.get("node_port").unwrap();
    let ipfs_api = IpfsApi::new(ipfs_node_ip, ipfs_node_port.parse::<u16>().unwrap());

    // Populate topic hashmap
    info!("Loading topic hashes from ../data_marketr/build/*.topic files..");
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
    info!("Connecting to ethereum node at {}", ws_url);
    let mut event_loop = tokio_core::reactor::Core::new().unwrap();
    let handle = event_loop.handle();
    let transp = web3::transports::WebSocket::with_event_loop(ws_url, &handle).unwrap();
    let web3 = web3::Web3::new(transp);

    // Print accounts and balance to check if websocket connection works
    let accounts = web3.eth().accounts().map(|accounts| {
        debug!("Accounts on node: {:?}", accounts);
        accounts[0]
	});

	let accs = event_loop.run(accounts).unwrap();
	let bal = web3.eth().balance(accs, None).map(|balance| {
		debug!("Balance of {}: {}", accs, balance);
	});
    event_loop.run(bal).unwrap();

    let database_association_contract = Contract::from_json(
        web3.eth(),
        database_association_address,
        include_bytes!("../../data_market/build/DatabaseAssociation.abi"),
    ).unwrap();

    // TODO To filter for specific events:
    //let desired_topics: std::option::Option<std::vec::Vec<web3::types::H256>> = Some(
    //    vec![*topics.get(&("DatabaseAssociation", "Voted".into())).unwrap(),
    //         *topics.get(&("DatabaseAssociation", "ProposalAdded".into())).unwrap()
    //    ]);
    let desired_topics: std::option::Option<std::vec::Vec<web3::types::H256>> = None;
    let num_events = match desired_topics {
        Some(ref vec) => vec.len(),
        None => 0
    };
    if num_events == 0 {
        info!("Listening for all events");
    } else {
        info!("Listening for {} events", num_events);
    }

    // Retrieve logs since last processed block
    if replay_past_events {
        info!("replay_past_events is true. Will replay events from the past..");
        let from_block = if last_processed_block_id.is_empty() {
                BlockNumber::Earliest
            } else {
                match last_processed_block_id.parse::<u64>() {
                    Ok(n) => BlockNumber::Number(n),
                    Err(_) => {warn!("Couldn't parse last_processed_block_id from configuration. Starting from earliest block..."); BlockNumber::Earliest },
                }
            };
        debug!("Replaying events from {:?} to latest block", from_block);
        let filter = FilterBuilder::default()
            .address(vec![database_association_contract.address()])
            .from_block(from_block)
            .to_block(BlockNumber::Latest)
            .topics(
                desired_topics.clone(),
                None,
                None,
                None,
            )
            .build();

        let event_future = web3.eth_filter()
            .create_logs_filter(filter)
            .and_then(|filter| {
                let res = filter.logs().and_then(|logs| {
                    for log in logs {
                        debug!("Replayed log: {:?}", log);
                        handle_log(log, true);
                    }
                    Ok(())
                });
                res
            })
            .map_err(|_| ());

        event_loop.run(event_future);
        debug!("Finished replay of events");
    }

    if subscribe_future_events {
        // Subscribe to current topics and handle them as they happen
        info!("Subscribing to current events..");
        let filter = FilterBuilder::default()
            .address(vec![database_association_contract.address()])
            .topics(
                desired_topics,
                None,
                None,
                None,
            )
            .build();

        let subscription_future = web3.eth_subscribe()
            .subscribe_logs(filter)
            .then(|sub| {
                sub.unwrap().for_each(|log| {
                    debug!("Subscribed log: {:?}", log);
                    handle_log(log, false);
                    Ok(())
                })
            })
            .map_err(|_| ());

        event_loop.run(subscription_future);
    }
}

fn handle_log(log: web3::types::Log, replayed_event: bool) {
    // TODO Handle filtered log here
}