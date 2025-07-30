import pandas as pd
from datetime import datetime

# === Configuration ===
actblue_file = 'debbie-wasserman-schultz-for-congress-12712-contributions-all (1).csv'  # Replace with your actual file path
nbi_file = 'ROASDWSReelect20250728-1591451764.csv'          # Replace with your actual file path
creation_date = datetime.today().strftime('%m/%d/%Y')  # Or set manually e.g. '07/28/2025'

# === Load CSVs ===
actblue = pd.read_csv(actblue_file)
nbi = pd.read_csv(nbi_file, sep='\t', encoding='utf-8-sig')


print("NBI columns:", nbi.columns.tolist())

# === Clean and prepare emails ===
actblue['Donor Email'] = actblue['Donor Email'].str.strip().str.lower()
nbi['PreferredEmail'] = nbi['PreferredEmail'].str.strip().str.lower()

# === Aggregate (SUMIFS) donation amounts per Donor Email ===
email_to_total = (
    actblue.groupby('Donor Email')['Amount']
    .sum()
    .rename('MatchedAmount')
    .reset_index()
)

# === Merge aggregated amounts into NBI data ===
updated_nbi = nbi.merge(email_to_total, how='left', left_on='PreferredEmail', right_on='Donor Email')
updated_nbi['MatchedAmount'] = updated_nbi['MatchedAmount'].fillna(0).round(2)
updated_nbi['Creation Date'] = creation_date
updated_nbi = updated_nbi.drop(columns=['Donor Email'])  # Optional cleanup
updated_nbi = updated_nbi.rename(columns={'MatchedAmount': 'Amount'})

# === Save Updated NBI CSV ===
updated_nbi.to_csv('Updated_NBI.csv', index=False)

# === Generate Summary by OriginCodeName ===
def generate_summary(df):
    summary = (
        df.groupby('OriginCodeName')
        .agg(
            Total_Donated=('Amount', 'sum'),
            Number_of_Donors=('Amount', lambda x: (x > 0).sum()),
            Total_Individuals=('Amount', 'count')
        )
        .reset_index()
    )
    summary['Average_Donated'] = summary.apply(
        lambda row: row['Total_Donated'] / row['Number_of_Donors'] if row['Number_of_Donors'] > 0 else 0,
        axis=1
    )

    # Totals row
    total_row = pd.DataFrame([{
        'OriginCodeName': 'TOTAL',
        'Total_Donated': summary['Total_Donated'].sum(),
        'Number_of_Donors': summary['Number_of_Donors'].sum(),
        'Total_Individuals': summary['Total_Individuals'].sum(),
        'Average_Donated': (
            summary['Total_Donated'].sum() / summary['Number_of_Donors'].sum()
            if summary['Number_of_Donors'].sum() > 0 else 0
        )
    }])

    summary = pd.concat([summary, total_row], ignore_index=True)
    summary[['Total_Donated', 'Average_Donated']] = summary[['Total_Donated', 'Average_Donated']].round(2)
    return summary

summary_df = generate_summary(updated_nbi)
summary_df.to_csv('Summary_By_OriginCodeName.csv', index=False)

print("✅ Updated_NBI.csv and Summary_By_OriginCodeName.csv have been generated.")
