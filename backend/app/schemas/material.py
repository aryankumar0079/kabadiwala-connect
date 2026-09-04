from pydantic import BaseModel, Field
from typing import Optional


class MaterialCreate(BaseModel):

    material_category: str = Field(
        ...,
        min_length=1
    )

    material_sub_category: Optional[str] = None

    material_description: Optional[str] = None

    approximate_weight: float = Field(
        ...,
        gt=0
    )

    condition: Optional[str] = None

    source_type: Optional[str] = None

    location: str = Field(
        ...,
        min_length=1
    )