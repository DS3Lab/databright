extern crate web3;
extern crate byteorder;
extern crate tokio_core;
extern crate futures;

use std::collections::HashMap;
use self::byteorder::{ByteOrder, BigEndian};
use web3::types::{Address, H256, Bytes};
use web3::contract::{Options, Contract};
use web3::transports::WebSocket;
use web3::futures::Future;
use futures::future::ok;
use ipfs_api::IpfsClient;
use std::str;

macro_rules! hashmap {
    ($( $key: expr => $val: expr ),*) => {{
         let mut map = ::std::collections::HashMap::new();
         $( map.insert($key, $val); )*
         map
    }}
}

pub fn handle_log(log: &web3::types::Log,
                  replayed_event: bool,
                  topics: &HashMap<(&str, String), H256>,
                  dba_contract: &Contract<WebSocket>,
                  ipfs_client: &IpfsClient) -> Box<Future<Item=(), Error=String>> {
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
            // Extract IPFS hashes from web3
            let propID = propadded_deserializer.get_u64("proposalID");
            //: web3::contract::QueryResult<Vec<String>, _>
            let prop_result_ftr = dba_contract.query::<Vec<String>, _,_,_>("proposals", (propID,), None, Options::default(), None);
            let printed_prop_res = prop_result_ftr.and_then(|res| {error!("debug output{:?}", res); ok(()) });
            return Box::new(printed_prop_res.map_err(|err| err.to_string()));
            //let res: Future<Item=Bytes, Error=()> = prop_result_ftr;
            //let return_future = prop_result_ftr.and_then(|res| {debug!("received {:?}", res);})
            // TODO Execute query, get database address from proposal, fetch shards from datase, fetch IPFS hashes

            
            // This shard contains the Iris dataset as an example. The real dataset should be loaded from the SimpleDatabase contract.
            //let ipfs_hashes = vec!["QmV8VSp8S5UfXF4tfGNBSU6VRP6uaGzYA3u5gwxDPXZDiP"]; // TODO Use real ipfs_shards, not this dummy.
            //let ipfs_hashes_prefixed = ipfs_hashes.iter().map(|hash| Some(&format!("/ipfs/{}", hash)[..]));
            //let ls_request_futures = ipfs_hashes_prefixed.map(|hash| ipfs_client.ls(hash));    
            // Load data from IPFS (put it in a temp dir)
            // Load into matrix (using database specific adapter)

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