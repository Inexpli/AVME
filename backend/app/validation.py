from datetime import date
from typing import List

from . import models, schemas


def validate_supplier(supplier: models.Supplier) -> List[schemas.ValidationIssue]:
    issues: List[schemas.ValidationIssue] = []
    if not supplier.name:
        issues.append(schemas.ValidationIssue(entity="supplier", entity_id=supplier.id, field="name", message="Missing supplier name."))
    if not supplier.country or supplier.country == "Unknown":
        issues.append(schemas.ValidationIssue(entity="supplier", entity_id=supplier.id, field="country", message="Missing or unknown country."))
    if not supplier.category or supplier.category == "Uncategorized":
        issues.append(schemas.ValidationIssue(entity="supplier", entity_id=supplier.id, field="category", message="Missing or uncategorized supplier category."))
    return issues


def validate_contract(contract: models.Contract) -> List[schemas.ValidationIssue]:
    issues: List[schemas.ValidationIssue] = []
    if not contract.title:
        issues.append(schemas.ValidationIssue(entity="contract", entity_id=contract.id, field="title", message="Missing contract title."))
    if contract.total_value is None or contract.total_value <= 0:
        issues.append(schemas.ValidationIssue(entity="contract", entity_id=contract.id, field="total_value", message="Contract value must be greater than zero."))
    if contract.expiry_date and contract.status == "active" and contract.expiry_date < date.today():
        issues.append(schemas.ValidationIssue(entity="contract", entity_id=contract.id, field="expiry_date", message="Active contract is already expired."))
    return issues


def validate_document(doc: models.Document) -> List[schemas.ValidationIssue]:
    issues: List[schemas.ValidationIssue] = []
    if not doc.filename:
        issues.append(schemas.ValidationIssue(entity="document", entity_id=doc.id, field="filename", message="Missing filename."))
    if not doc.doc_type:
        issues.append(schemas.ValidationIssue(entity="document", entity_id=doc.id, field="doc_type", message="Missing document type."))
    if doc.status == "validated" and not doc.stored_path:
        issues.append(schemas.ValidationIssue(entity="document", entity_id=doc.id, field="stored_path", message="Validated document has no stored file."))
    return issues
