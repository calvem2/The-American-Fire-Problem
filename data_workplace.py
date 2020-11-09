import pandas as pd

df = pd.read_csv('docs/over0.5AcreWithIDs.csv') #full dataset
group = df[["STATE", "FIRE_YEAR", "FIRE_SIZE"]].groupby(["STATE", "FIRE_YEAR"]).count()
group.columns = ['FIRE_COUNT']
group.reset_index(inplace=True)


#df['FIRE_NAME'] = fire_name_array
#df.to_csv("cleanedWildfiresNoNulls.csv")
group.to_csv("docs/fireCountsOver0.5Acre.csv", index_label="ID")