import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_table():
    server = os.getenv('DB_SERVER', r'ERP_G7\VINA_G7')
    database = os.getenv('DB_NAME', 'Test')
    username = os.getenv('DB_USER', 'sa')
    password = os.getenv('DB_PASSWORD', 'Admin@123')
    driver = '{ODBC Driver 17 for SQL Server}'
    
    conn_str = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    
    print(f"Connecting to {server}...")
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        print("Creating table 'pallet_cards'...")
        
        create_table_query = """
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pallet_cards]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[pallet_cards] (
                [id] [int] IDENTITY(1,1) NOT NULL,
                [pallet_code] [nvarchar](100) NULL,
                [khsx_code] [nvarchar](100) NULL,
                [po_code] [nvarchar](100) NULL,
                [customer_name] [nvarchar](255) NULL,
                [product_code] [nvarchar](100) NULL,
                [detail_name] [nvarchar](255) NULL,
                [specification] [nvarchar](255) NULL,
                [quantity_plan] [int] DEFAULT 0,
                [quantity_actual] [int] DEFAULT 0,
                [wood_standard] [nvarchar](255) NULL,
                [wood_supplier] [nvarchar](255) NULL,
                [sheet_data] [nvarchar](max) NULL,
                [created_at] [datetime] DEFAULT GETDATE(),
                [updated_at] [datetime] DEFAULT GETDATE(),
                [status] [int] DEFAULT 1,
                [created_by] [int] NULL,
                CONSTRAINT [PK_pallet_cards] PRIMARY KEY CLUSTERED ([id] ASC)
            )
            CREATE INDEX IX_pallet_cards_pallet_code ON [dbo].[pallet_cards](pallet_code);
            CREATE INDEX IX_pallet_cards_khsx_code ON [dbo].[pallet_cards](khsx_code);
            CREATE INDEX IX_pallet_cards_po_code ON [dbo].[pallet_cards](po_code);
            
            print 'Table pallet_cards created successfully!'
        END
        ELSE
        BEGIN
            print 'Table pallet_cards already exists.'
        END
        """
        
        cursor.execute(create_table_query)
        conn.commit()
        print("Done.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    create_table()
