-- ============================================================================
-- SMARTFLOW QUẢN LÝ CLAIM - SQL SERVER DATABASE SETUP SCRIPT
-- Database Engine: Microsoft SQL Server (2016 / 2019 / 2022 / Express)
-- Database Name: Test (hoặc tên Database cấu hình trong file BackEnd/.env)
-- ============================================================================

USE [Test];
GO

-- 1. BẢNG MÃ LỖI NỘI BỘ G7 (defect_types)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[defect_types]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[defect_types] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [code] NVARCHAR(50) NULL UNIQUE,
        [name] NVARCHAR(250) NOT NULL,
        [category] NVARCHAR(50) NOT NULL DEFAULT 'MAT',
        [stage] NVARCHAR(500) NULL,
        [description] NVARCHAR(1000) NULL,
        [aql_class] NVARCHAR(50) NULL DEFAULT 'Minor',
        [needs_tracking] BIT NOT NULL DEFAULT 0,
        [qc_tracking] BIT NOT NULL DEFAULT 0,
        [is_active] BIT NOT NULL DEFAULT 1
    );
    CREATE INDEX [ix_defect_types_code] ON [dbo].[defect_types] ([code]);
    PRINT 'Created table defect_types successfully.';
END
GO

-- 2. BẢNG MÃ LỖI KHÁCH HÀNG (client_defects)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[client_defects]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[client_defects] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [code] NVARCHAR(50) NOT NULL UNIQUE,
        [name] NVARCHAR(250) NOT NULL,
        [name_en] NVARCHAR(250) NULL,
        [minor_criteria] NVARCHAR(500) NULL,
        [major_criteria] NVARCHAR(500) NULL,
        [critical_criteria] NVARCHAR(500) NULL,
        [detection_method] NVARCHAR(250) NULL DEFAULT 'MẮT',
        [g7_code] NVARCHAR(50) NULL,
        [defect_type_id] INT NULL,
        [is_active] BIT NOT NULL DEFAULT 1,
        CONSTRAINT [FK_client_defects_defect_types] FOREIGN KEY ([defect_type_id])
            REFERENCES [dbo].[defect_types] ([id]) ON DELETE SET NULL
    );
    CREATE INDEX [ix_client_defects_code] ON [dbo].[client_defects] ([code]);
    PRINT 'Created table client_defects successfully.';
END
GO

-- 3. BẢNG CHÚ THÍCH PHÂN LOẠI LỖI (defect_glossaries)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[defect_glossaries]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[defect_glossaries] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [source] NVARCHAR(50) NOT NULL, -- 'ATLAS' hoặc 'G7'
        [code] NVARCHAR(50) NOT NULL,
        [description] NVARCHAR(500) NOT NULL
    );
    CREATE INDEX [ix_defect_glossaries_code] ON [dbo].[defect_glossaries] ([code]);
    PRINT 'Created table defect_glossaries successfully.';
END
GO

-- 4. BẢNG KHIẾU NẠI KHÁCH HÀNG (customer_claims)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_claims]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[customer_claims] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [claim_code] NVARCHAR(50) NOT NULL UNIQUE,
        [customer_name] NVARCHAR(100) NULL DEFAULT 'Atlas',
        [product_name] NVARCHAR(150) NOT NULL,
        [order_code] NVARCHAR(50) NULL,
        [company_error_code] NVARCHAR(50) NULL,
        [description] NVARCHAR(1000) NULL,
        [severity] NVARCHAR(20) NULL DEFAULT 'Medium',
        [status] NVARCHAR(50) NULL DEFAULT 'Received',
        [lpn] NVARCHAR(50) NULL,
        [container_no] NVARCHAR(50) NULL,
        [action] NVARCHAR(200) NULL,
        [period] NVARCHAR(20) NULL,
        [image_paths] NVARCHAR(MAX) NULL,
        [image_captions] NVARCHAR(MAX) NULL,
        [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
        [resolved_at] DATETIME NULL
    );
    CREATE INDEX [ix_customer_claims_code] ON [dbo].[customer_claims] ([claim_code]);
    PRINT 'Created table customer_claims successfully.';
END
GO

-- 5. BẢNG ĐƠN GIÁ TỦ GỖ (cabinet_prices)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cabinet_prices]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[cabinet_prices] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [cabinet_code] NVARCHAR(50) NOT NULL UNIQUE,
        [cabinet_name] NVARCHAR(150) NOT NULL,
        [material] NVARCHAR(100) NULL,
        [dimensions] NVARCHAR(50) NULL,
        [base_price] FLOAT NOT NULL DEFAULT 0,
        [sale_price] FLOAT NOT NULL DEFAULT 0,
        [status] NVARCHAR(50) NULL DEFAULT 'Active',
        [last_updated] DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX [ix_cabinet_prices_code] ON [dbo].[cabinet_prices] ([cabinet_code]);
    PRINT 'Created table cabinet_prices successfully.';
END
GO
