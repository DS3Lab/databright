import json, os

COMPILED_JSONS_RELDIR = '../build/contracts/'
current_file_directory = os.path.dirname(os.path.realpath(__file__))
json_dir = os.path.join(current_file_directory, COMPILED_JSONS_RELDIR)
for filename in os.listdir(json_dir):
	if filename.endswith(".json"):
		print("Extracting ABI of", filename)
		with open(os.path.join(json_dir, filename), 'r') as infile:

			trufflefile = json.load(infile)
			abifilename = os.path.splitext(os.path.basename(filename))[0] + '.abi'
			outfilepath = os.path.join(json_dir, "..", abifilename)
			with open(outfilepath, 'w') as outfile:
				outfile.write(json.dumps(trufflefile['abi']))