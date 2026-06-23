# -*- coding: utf-8 -*-
"""
Test script to check database connection and claim saving
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from config.database import SessionLocal
    from modules.claim.models.claim_models import CustomerClaim
    from modules.claim.schemas.claim_schemas import CustomerClaimCreate
    from modules.claim.controllers import claim_controller
    
    print("Successfully imported database modules")
    
    # Test database connection
    print("\nTesting database connection...")
    db = SessionLocal()
    try:
        # Test query
        claims = db.query(CustomerClaim).limit(1).all()
        print(f"Database connection successful! Found {len(claims)} existing claims")
        
        # Test creating a claim
        print("\nTesting claim creation...")
        test_claim = CustomerClaimCreate(
            claim_code="TEST-001",
            customer_name="Test Customer",
            product_name="TEST-SKU",
            order_code="TEST-DEFECT",
            company_error_code="TEST-COMPANY",
            description="Test description",
            severity="Medium",
            status="Received",
            lpn="1234567",
            container_no="TEST1234567",
            action="Test Action",
            period="06-2025",
            image_paths=[],
            image_captions=[]
        )
        
        result = claim_controller.create_claim(db, test_claim)
        print(f"Successfully created test claim with ID: {result.id}")
        
        # Clean up test claim
        db.delete(result)
        db.commit()
        print("Cleaned up test claim")
        
    except Exception as e:
        print(f"Database error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        
except Exception as e:
    print(f"Import error: {e}")
    import traceback
    traceback.print_exc()
