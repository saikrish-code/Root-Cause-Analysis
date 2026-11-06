"""Initial schema migration for RCA module

Revision ID: 001
Revises: 
Create Date: 2026-11-06

"""
from typing import Union

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.create_table(
        "deviations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("deviation_number", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("product_name", sa.String(length=255), nullable=True),
        sa.Column("batch_lot_number", sa.String(length=100), nullable=True),
        sa.Column("manufacturing_date", sa.Date(), nullable=True),
        sa.Column("detected_date", sa.Date(), nullable=True),
        sa.Column("site_block", sa.Enum("Manufacturing", "Packaging", "QC_Lab", "Warehouse", "Utilities", name="siteblock_enum"), nullable=False),
        sa.Column("severity", sa.Enum("Critical", "Major", "Minor", name="severity_enum"), nullable=False),
        sa.Column("status", sa.Enum("Open", "Under_Investigation", "RCA_Complete", "CAPA_Assigned", "Closed", name="deviationstatus_enum"), nullable=False),
        sa.Column("source_document_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deviations_id"), "deviations", ["id"], unique=False)
    op.create_index(op.f("ix_deviations_deviation_number"), "deviations", ["deviation_number"], unique=True)

    op.create_table(
        "evidence_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("deviation_id", sa.Integer(), nullable=False),
        sa.Column("evidence_type", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("collected", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("is_ai_flagged_missing", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["deviation_id"], ["deviations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_evidence_items_id"), "evidence_items", ["id"], unique=False)

    op.create_table(
        "rca_investigations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("deviation_id", sa.Integer(), nullable=False),
        sa.Column("method", sa.Enum("five_whys", "fishbone", name="rcamethod_enum"), nullable=False),
        sa.Column("status", sa.Enum("In_Progress", "Completed", "Rejected", name="rcastatus_enum"), nullable=False),
        sa.Column("ai_generated", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("reviewed_by_user", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("confirmed_root_cause", sa.Text(), nullable=True),
        sa.Column("confidence_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["deviation_id"], ["deviations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rca_investigations_id"), "rca_investigations", ["id"], unique=False)

    op.create_table(
        "five_whys_steps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rca_investigation_id", sa.Integer(), nullable=False),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("why_question", sa.Text(), nullable=True),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("is_ai_suggested", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("user_edited", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.ForeignKeyConstraint(["rca_investigation_id"], ["rca_investigations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_five_whys_steps_id"), "five_whys_steps", ["id"], unique=False)

    op.create_table(
        "fishbone_causes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rca_investigation_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("cause_text", sa.Text(), nullable=False),
        sa.Column("is_ai_suggested", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("user_edited", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.ForeignKeyConstraint(["rca_investigation_id"], ["rca_investigations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_fishbone_causes_id"), "fishbone_causes", ["id"], unique=False)

    op.create_table(
        "capa_actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("deviation_id", sa.Integer(), nullable=False),
        sa.Column("action_type", sa.Enum("Corrective", "Preventive", name="capaactiontype_enum"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("owner", sa.String(length=255), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.Enum("Proposed", "Approved", "In_Progress", "Completed", name="capastatus_enum"), nullable=False),
        sa.Column("ai_generated", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("reviewed_by_user", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["deviation_id"], ["deviations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_capa_actions_id"), "capa_actions", ["id"], unique=False)

    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("field_changed", sa.String(length=100), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("changed_by", sa.String(length=255), nullable=True),
        sa.Column("source", sa.Enum("ai", "user", name="auditsource_enum"), nullable=False),
        sa.Column("changed_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_log_id"), "audit_log", ["id"], unique=False)


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("capa_actions")
    op.drop_table("fishbone_causes")
    op.drop_table("five_whys_steps")
    op.drop_table("rca_investigations")
    op.drop_table("evidence_items")
    op.drop_table("deviations")

    sa.Enum(name="siteblock_enum").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="severity_enum").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="deviationstatus_enum").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="rcamethod_enum").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="rcastatus_enum").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="capaactiontype_enum").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="capastatus_enum").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="auditsource_enum").drop(op.get_bind(), checkfirst=False)