import csv
infile="/opt/poke-edu/database/items_clean.csv"
outfile="/opt/poke-edu/database/insert_items.sql"
with open(infile, newline='', encoding='utf8') as f, open(outfile,'w',encoding='utf8') as o:
    r=csv.reader(f)
    o.write("BEGIN;\n")
    for row in r:
        while len(row)<8:
            row.append('')
        item_id=row[0].replace("'","''")
        name=row[1].replace("'","''")
        desc=row[2].replace("'","''")
        price=row[3]
        price_sql = price if price.isdigit() else 'NULL'
        code=row[4].replace("'","''")
        value=row[5]
        value_sql = value if (value and value.isdigit()) else 'NULL'
        rarity=row[6].replace("'","''")
        image=row[7].replace("'","''")
        o.write(f"INSERT INTO items(item_id,name,description,price,code,value,rarity,image) VALUES ('{item_id}','{name}','{desc}',{price_sql},'{code}',{value_sql},'{rarity}','{image}');\n")
    o.write("COMMIT;\n")
print('Wrote', outfile)
