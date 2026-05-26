from datetime import date

from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    sap_id = Column(String, nullable=True, index=True, unique=True)
    dataverse_id = Column(String, nullable=True, index=True, unique=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    risk_score = Column(Integer, nullable=False, default=50)
    risk_level = Column(String, nullable=False, default="medium")
    created_at = Column(Date, nullable=False, default=date.today)

    contracts = relationship("Contract", back_populates="supplier", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="supplier", cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    expiry_date = Column(Date, nullable=False)
    total_value = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="USD")

    supplier = relationship("Supplier", back_populates="contracts")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    filename = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="processing")
    created_at = Column(Date, nullable=False, default=date.today)
    stored_path = Column(String, nullable=True)

    supplier = relationship("Supplier", back_populates="documents")


class SupplierOnboarding(Base):
    __tablename__ = "supplier_onboarding"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(String, nullable=False, default="pending_documents")
    contact_email = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    required_docs = Column(String, nullable=True)
    submitted_docs = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(Date, nullable=False, default=date.today)
    updated_at = Column(Date, nullable=False, default=date.today)

    supplier = relationship("Supplier")

