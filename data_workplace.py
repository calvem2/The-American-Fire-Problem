import pandas as pd


#RUN TO CREATE A FIRE COUNTS DATASET.
''' 
df = pd.read_csv('docs/over0.5AcreWithIDs.csv') #full dataset
group = df[["STATE", "FIRE_YEAR", "FIRE_SIZE"]].groupby(["STATE", "FIRE_YEAR"]).count()
group.columns = ['FIRE_COUNT']
group.reset_index(inplace=True)


#df['FIRE_NAME'] = fire_name_array
#df.to_csv("cleanedWildfiresNoNulls.csv")
group.to_csv("docs/fireCountsOver0.5Acre.csv", index_label="ID")
'''


#REMOVING PUERTO RICO FROM DATASET.
'''
df = pd.read_csv('docs/over0.5AcreWithIDs.csv')
df = df.loc[df["STATE"] != "Puerto Rico"]
df.to_csv('docs/over0.5AcreWithIDs(2).csv', index=False)
'''

#setting up fires per acre
df = pd.read_csv('docs/fireCountsOver0.5Acre.csv')
df2 = pd.read_csv('acres.csv')
df2 = df2[["State", "LandArea"]]
firesPerAcre = []
for i in range(len(df)):
    fireCount = df.iloc[i]['FIRE_COUNT']
    state = df.iloc[i]['STATE'] if df.iloc[i]['STATE'] != "District of Columbia" else "Washington DC"
    acreage = df2.loc[df2['State'] == state]['LandArea'].values[0] * 600
    firesPerAcre.append(fireCount / acreage * 10000)

df['FIRES_PER_10K_ACRE'] = firesPerAcre
df.to_csv("firesPerAcre.csv", index=False)
print("DONE")