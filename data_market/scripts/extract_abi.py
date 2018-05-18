import json, os, csv
from Crypto.Hash import keccak

COMPILED_JSONS_RELDIR = '../build/contracts/'
current_file_directory = os.path.dirname(os.path.realpath(__file__))
json_dir = os.path.join(current_file_directory, COMPILED_JSONS_RELDIR)

def stringify_event(obj):
  name = obj['name']
  inputs = [x['type'] for x in obj['inputs']]
  final_string = name + '(' + ','.join(inputs) + ')'
  return final_string

def keccakify(event_str):
  keccak_hash = keccak.new(digest_bits=256)
  keccak_hash.update(event_str.encode('ascii'))
  return keccak_hash.hexdigest()

for filename in os.listdir(json_dir):
  if filename.endswith(".json"):
    print("Extracting ABI of", filename)
    with open(os.path.join(json_dir, filename), 'r') as infile:

      # Extract ABI interfaces and save them as *.abi files
      trufflefile = json.load(infile)
      outbasefilename = os.path.splitext(os.path.basename(filename))[0]
      abifilename = outbasefilename + '.abi'
      outfilepath = os.path.join(json_dir, "..", abifilename)
      with open(outfilepath, 'w') as outfile:
        outfile.write(json.dumps(trufflefile['abi']))

      # Extract events, calculate topic hashes and save them as *.topic files 
      print("Extracting topics of", filename)
      events = [(obj['name'], keccakify(stringify_event(obj))) for obj in trufflefile['abi'] if obj['type'] == 'event']
      topicfilename = outbasefilename + '.topic'
      topicoutfilepath = os.path.join(json_dir, "..", topicfilename)

      with open(topicoutfilepath, 'w') as csvfile:
          topicwriter = csv.writer(csvfile, delimiter=',')
          topicwriter.writerow(['EVENT_NAME','TOPIC_HASH'])
          for tup in events:
            topicwriter.writerow(tup)
