
import sys
from datetime import datetime, timezone
from pathlib import Path
from pymongo import MongoClient
from bson import json_util

SNAPSHOT = Path('/app/test_reports/ui_tax_state_snapshot.json')

def read_env(path):
    out = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            out[k] = v.strip().strip('"')
    return out

backend_env = read_env('/app/backend/.env')
client = MongoClient(backend_env.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[backend_env.get('DB_NAME', 'test_database')]

def snapshot():
    data = {
        'tax_rates': list(db.tax_rates.find({})),
        'settings': list(db.settings.find({'key': {'$in': ['PRICES_INCLUDE_TAX']}})),
    }
    SNAPSHOT.write_text(json_util.dumps(data, indent=2))
    print(f'snapshot saved to {SNAPSHOT}')

def restore():
    data = json_util.loads(SNAPSHOT.read_text())
    db.tax_rates.delete_many({})
    if data['tax_rates']:
        db.tax_rates.insert_many(data['tax_rates'])
    db.settings.delete_many({'key': {'$in': ['PRICES_INCLUDE_TAX']}})
    if data['settings']:
        db.settings.insert_many(data['settings'])
    print('tax/settings restored from snapshot')

def set_include(val: bool):
    db.settings.update_one({'key': 'PRICES_INCLUDE_TAX'}, {'$set': {'key': 'PRICES_INCLUDE_TAX', 'value': 'true' if val else 'false', 'category': 'checkout', 'updated_at': datetime.now(timezone.utc)}}, upsert=True)

def set_global(percent, name, include=True):
    db.tax_rates.delete_many({})
    db.tax_rates.insert_one({'id': 'qa_ui_global', 'name': name, 'percent': float(percent), 'scope': 'all', 'category_ids': [], 'subcategory_ids': [], 'active': True, 'order': 1, 'created_at': datetime.now(timezone.utc)})
    set_include(include)
    print(f'set one active global rate {name} {percent} include={include}')

def clear_rates(include=True):
    db.tax_rates.delete_many({})
    set_include(include)
    print(f'cleared tax rates include={include}')

cmd = sys.argv[1] if len(sys.argv) > 1 else ''
if cmd == 'snapshot': snapshot()
elif cmd == 'restore': restore()
elif cmd == 'set_global_5': set_global(5, 'GST 5%', True)
elif cmd == 'set_global_10_exclusive': set_global(10, 'GST 10%', False)
elif cmd == 'clear': clear_rates(True)
else:
    raise SystemExit('usage: snapshot|restore|set_global_5|set_global_10_exclusive|clear')
