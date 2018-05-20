extern crate ini;
extern crate csv;

use ini::Ini;
use std::collections::HashMap;


fn main() {
    let conf = Ini::load_from_file("config.ini").unwrap();
    let section = conf.section(Some("Contracts".to_owned())).unwrap();
    let contracts = section.get("contracts").unwrap();
    let contract_path = section.get("contractpath").unwrap();

    let mut topics: HashMap<(&str, String), String> = HashMap::new();
    for contract in contracts.split(",") {
        let mut rdr = csv::Reader::from_path(format!("{}{}.topic",contract_path, contract)).unwrap();
        
        for rec in rdr.records() {
            let rr = rec.unwrap();
            let v1 = rr.get(0).unwrap();
            let v2 = rr.get(1).unwrap();
            topics.insert((contract, v1.to_owned()), v2.to_owned());
        }
    }
}