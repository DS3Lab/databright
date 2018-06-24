extern crate web3;
extern crate byteorder;
extern crate tokio_core;
extern crate futures;
extern crate hyper;

use std::collections::HashMap;
use self::byteorder::{ByteOrder, BigEndian};
use web3::Web3;
use web3::transports::WebSocket;
use web3::types::{Address, H256};
use web3::contract::{Options, Contract};
use web3::futures::Future;
use futures::future::{ok, join_all};
use futures::Stream;
use ipfs_api::IpfsClient;
use std::path::Path;
use self::hyper::Chunk;
use ipfs_api;
use std::str;
use std;

macro_rules! hashmap {
    ($( $key: expr => $val: expr ),*) => {{
         let mut map = ::std::collections::HashMap::new();
         $( map.insert($key, $val); )*
         map
    }}
}

pub fn handle_log<'a>(log: &web3::types::Log,
                  replayed_event: bool,
                  topics: &HashMap<(&str, String), H256>,
                  dba_contract: &Contract<WebSocket>,
                  ipfs_client: &'a IpfsClient,
                  web3: &'a Web3<WebSocket>,
                  tmp_folder_location: &'a str) -> Box<Future<Item=(), Error=String> + 'a> {

    info!("Handling log: {:?}", log.topics[0]);
    
    if log.topics[0] == *topics.get(&("DatabaseAssociation", "ProposalAdded".into())).unwrap() {
        // Initialize event deserializer
        let order = vec!["proposalID", "recipient", "amount", "description", "argument", "argument2", "curator", "state"];
        let fields: HashMap<&str, &str> = hashmap!["proposalID" => "uint",
                                                                     "recipient" => "address",
                                                                     "amount" => "uint",
                                                                     "description" => "string",
                                                                     "argument" => "string",
                                                                     "argument2" => "uint",
                                                                     "curator" => "address",
                                                                     "state" => "uint"];
        let propadded_deserializer = LogdataDeserializer::new(&log.data.0, fields, order);
        let state = propadded_deserializer.get_u64("state");
        debug!("Proposal has state {}", state);
        if state == 2 { // State == 2: This is a shard add proposal
            
            // The ProposalAdded log contains the proposalID. We use this to load the proposal from Ethereum.
            let propID = propadded_deserializer.get_u64("proposalID");
            let proposal_result_future = dba_contract.query::<(Address, u64, String, u64, bool, bool, u64, Vec<u8>, String, u64, Address, u64), _,_,_>("proposals", (propID,), None, Options::default(), None);
            let dbcontract_arrlen_future = proposal_result_future.join(ok(web3)).and_then(move |(proposal, web3)| {
                // The first field in the proposal struct is the address of the SimpleDatabase contract affected by the proposal
                let contract_address = proposal.0;
                
                let db_contract = Contract::from_json(
                    web3.eth(),
                    contract_address,
                    include_bytes!("../../marketplaces/build/SimpleDatabase.abi"),
                ).unwrap();

                let database_local_folder = Path::new(tmp_folder_location).join(contract_address.to_string());
                // To get all files from IPFS, we first need to fetch all shards from Ethereum
                // To loop through all shards in the array, the array length is needed.
                let arrlen_query = db_contract.query::<u64, _,_,_>("getShardArrayLength", (), None, Options::default(), None);
                ok((db_contract, database_local_folder)).join(arrlen_query)
            }).map_err(|err| err.to_string());

            let carry_fut = ok(web3).join(ok(ipfs_client));
            let final_future = dbcontract_arrlen_future.join(carry_fut)
            .and_then(|(((db_contract, database_local_folder), arrlen), (web3, ipfs_client))| {

                let mut all_file_download_futures = Vec::new();
                for i in 0..arrlen {
                    // Loop through the array and fetch each shard individually
                    let ipfs_fut = ok(ipfs_client);
                    let shard_fut = db_contract.query::<(Address, String, u64, u64), _,_,_>("shards", (i,), None, Options::default(), None)
                                    .map_err(|err| err.to_string());
                    let dir_list_future = shard_fut.join(ipfs_fut)
                                          .map_err(|err| err.to_string())
                                          .and_then(|(shard, ipfs_client)| {
                                        ipfs_client.ls(Some(&shard.1)).map_err(|err| err.to_string())
                                    });
                    
                    let ipfs_fut2 = ok(ipfs_client);
                    let fut = dir_list_future.join(ipfs_fut2)
                                        .map_err(|err| err.to_string())
                                        .and_then(|(ls_response, ipfs_client)| {
                                        // From the ipfs.ls command receive a list of files in the directory. Each of them we download
                                        //: Vec<std::boxed::Box<futures::Stream<Error=ipfs_api::response::Error, Item=Chunk>>> 
                                        let file_get_futures: Vec<futures::stream::Concat2<std::boxed::Box<futures::Stream<Error=ipfs_api::response::Error, Item=hyper::Chunk>>>> = ls_response.objects.iter().map(|ipfs_file| ipfs_client.get(&ipfs_file.hash).concat2()).collect();
                                        join_all(file_get_futures).map_err(|err| err.to_string())
                                    });
                    all_file_download_futures.push(fut);
                }
                                
                join_all(all_file_download_futures)
                //  create tmp directory unique to this proposal
                //  ... load each file in the individual directories to tmp dir
            });
            
            // This shard contains the Iris dataset as an example. The real dataset should be loaded from the SimpleDatabase contract.
            //let ipfs_hashes = vec!["QmV8VSp8S5UfXF4tfGNBSU6VRP6uaGzYA3u5gwxDPXZDiP"]; // TODO Use real ipfs_shards, not this dummy.
            //let ipfs_hashes_prefixed = ipfs_hashes.iter().map(|hash| Some(&format!("/ipfs/{}", hash)[..]));
            //let ls_request_futures = ipfs_hashes_prefixed.map(|hash| ipfs_client.ls(hash));    
            // Load data from IPFS (put it in a temp dir)
            // Load into matrix (using database specific adapter)
            return Box::new(final_future.and_then(|res| ok(())).map_err(|err| err.to_string()));
        }
        
    } else {
        info!("Unhandled log: {:?}", log);
    }

    return Box::new(ok(())); // TODO Return proper value from feature. This is only for debugging!
}


pub struct LogdataDeserializer<'a> {
    order: Vec<&'a str>,
    fields: HashMap<&'a str, &'a str>, // field name -> data type
    data: &'a Vec<u8>,
    offsets: HashMap<&'a str, (usize, usize)> // field name -> starting offset
}

impl<'a> LogdataDeserializer<'a> {
    pub fn new(data: &'a Vec<u8>, fields: HashMap<&'a str, &'a str>, order: Vec<&'a str>) -> LogdataDeserializer<'a> {
        let mut lds = LogdataDeserializer {
            data: data,
            fields: fields,
            order: order,
            offsets: HashMap::new()
        };
        
        lds.findAndStoreOffsets();
        lds
    }

    fn findAndStoreOffsets(&mut self) {

        //loop through fields
        let mut currentBlockOffset: usize = 0;
         for name in &self.order {
             let datatype = self.fields.get(name).unwrap();
             let startOffset = currentBlockOffset;
             
             let offsetTuple = match *datatype {
                 "uint" => (currentBlockOffset + 24, currentBlockOffset + 32), // = usize256 = 32 Bytes
                 "address" => (currentBlockOffset + 12, currentBlockOffset + 32), // = usually only 160b, but padded to 256b = 32 bytes
                 "string" => self.getStringOffsets(currentBlockOffset),
                 _ => {error!("Unsupported datatype in LogdataDeserializer"); (0,0)}
             };
            currentBlockOffset += 32;
             self.offsets.insert(name, offsetTuple);
        }
    }

    fn getStringOffsets(&self, stringPointerBlockOffset: usize) -> (usize, usize) {
        let slice = &self.data[(stringPointerBlockOffset+24)..(stringPointerBlockOffset+32)]; // Only take the least significant 8 Bytes into account (see description above)
        let stringLengthBlockOffset = BigEndian::read_u64(slice) as usize;

        let slice = &self.data[(stringLengthBlockOffset+24)..(stringLengthBlockOffset+32)];
        let stringLength = BigEndian::read_u64(slice) as usize;

        let stringStartOffset = stringLengthBlockOffset + 32;
        let stringEndOffset = stringStartOffset + stringLength;

        (stringStartOffset, stringEndOffset)
    }
    
    pub fn get_u64(&self, field_name: &str) -> u64 {
        //get field offset
        let (start, end) = self.offsets.get(field_name).unwrap();
        //get data type
        let datatype = self.fields.get(field_name).unwrap();
        
        match *datatype {
            "uint" => {
                /* The default uint contains 256b = 32 Bytes
                 * Byteorder supports a max of 64b, hence we hackily only take the least significant 64b = 8 Bytes
                 * into account when converting to u64.
                 * 
                 * Usage of uint should be discouraged, as it probably is too large for our usecases anyways
                 */  
                let slice = &self.data[*start..*end];
                BigEndian::read_u64(slice)
            }
            _ => {error!("Couldn't read u64 in LogdataDeserializer"); 0}
        }
    }

    pub fn get_address(&self, field_name: &str) -> Address {
        //get field offset
        let (start, end) = self.offsets.get(field_name).unwrap();
        //get data type
        let datatype = self.fields.get(field_name).unwrap();
        
        match *datatype {
            "address" => {
                /* The default address contains 160b, but its padded to 256b = 32 bytes
                 * Hence we only take the least significant 160b = 20 Bytes
                 */
                
                let slice = &self.data[*start..*end];
                Address::from_slice(slice)
            }
            _ => {error!("Couldn't read address in LogdataDeserializer"); Address::default()}
        }
    }

    pub fn get_str(&self, field_name: &str) -> &str {
        //get field offset
        let (start, end) = self.offsets.get(field_name).unwrap();
        //get data type
        let datatype = self.fields.get(field_name).unwrap();
        
        match *datatype {
            "string" => {
                let slice = &self.data[*start..*end];
                str::from_utf8(slice).unwrap()
            }
            _ => {error!("Couldn't read str in LogdataDeserializer"); ""}
        }
    }
}