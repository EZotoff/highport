"""Pydantic models for portrait generation endpoints."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class PortraitEntityType(str, Enum):
    TRAVELLER = "traveller"
    NPC = "npc"


class PortraitGender(str, Enum):
    FEMALE = "female"
    MALE = "male"
    NONBINARY = "nonbinary"
    AMBIGUOUS = "ambiguous"


class PortraitAgeRange(str, Enum):
    CHILD = "child"
    TEEN = "teen"
    YOUNG_ADULT = "young_adult"
    ADULT = "adult"
    MIDDLE_AGED = "middle_aged"
    ELDER = "elder"


class PortraitSkinTone(str, Enum):
    VERY_FAIR = "very_fair"
    FAIR = "fair"
    MEDIUM = "medium"
    OLIVE = "olive"
    BROWN = "brown"
    DARK = "dark"


class PortraitEyeColor(str, Enum):
    BROWN = "brown"
    HAZEL = "hazel"
    GREEN = "green"
    BLUE = "blue"
    GRAY = "gray"
    AMBER = "amber"


class PortraitHairColor(str, Enum):
    BLACK = "black"
    BROWN = "brown"
    BLONDE = "blonde"
    RED = "red"
    GRAY = "gray"
    WHITE = "white"
    DYED = "dyed"


class PortraitHairStyle(str, Enum):
    BUZZCUT = "buzzcut"
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"
    BALD = "bald"
    PONYTAIL = "ponytail"
    BRAIDS = "braids"
    AFRO = "afro"
    WAVY = "wavy"
    CURLY = "curly"


class PortraitBuild(str, Enum):
    SLIM = "slim"
    AVERAGE = "average"
    ATHLETIC = "athletic"
    STOCKY = "stocky"
    HEAVY = "heavy"


class PortraitHeight(str, Enum):
    SHORT = "short"
    AVERAGE = "average"
    TALL = "tall"


class PortraitRankLevel(str, Enum):
    LOW = "low"
    MID = "mid"
    HIGH = "high"


class PortraitCareerStyle(str, Enum):
    UNIFORMED = "uniformed"
    CIVILIAN = "civilian"
    CORPORATE = "corporate"
    STREET = "street"
    FORMAL = "formal"


class PortraitDemeanor(str, Enum):
    CALM = "calm"
    STERN = "stern"
    FRIENDLY = "friendly"
    ALOOF = "aloof"
    NERVOUS = "nervous"
    AGGRESSIVE = "aggressive"


class PortraitVibe(str, Enum):
    TRUSTWORTHY = "trustworthy"
    MENACING = "menacing"
    MYSTERIOUS = "mysterious"
    ECCENTRIC = "eccentric"
    PROFESSIONAL = "professional"


class PortraitHomeworldType(str, Enum):
    HIGH_TECH = "high_tech"
    INDUSTRIAL = "industrial"
    FRONTIER = "frontier"
    AGRICULTURAL = "agricultural"
    UNDERCLASS = "underclass"
    RICH_CORE = "rich_core"


class PortraitSocialClass(str, Enum):
    LOW = "low"
    MIDDLE = "middle"
    UPPER = "upper"
    NOBLE = "noble"


class PortraitRelationshipType(str, Enum):
    ALLY = "ally"
    ENEMY = "enemy"
    NEUTRAL = "neutral"
    PATRON = "patron"
    CONTACT = "contact"
    FAMILY = "family"
    RIVAL = "rival"


class PortraitImportanceLevel(str, Enum):
    EXTRA = "extra"
    SUPPORTING = "supporting"
    KEY = "key"


class PortraitRenderStyle(str, Enum):
    REALISTIC = "realistic"
    PAINTERLY = "painterly"
    CINEMATIC = "cinematic"
    COMIC = "comic"


class PortraitFraming(str, Enum):
    HEADSHOT = "headshot"
    BUST = "bust"
    FULL_BODY = "full_body"


class PortraitLighting(str, Enum):
    NEUTRAL = "neutral"
    DRAMATIC = "dramatic"
    LOW_KEY = "low_key"
    HIGH_KEY = "high_key"


class PortraitCareerType(str, Enum):
    NAVY = "navy"
    MARINES = "marines"
    SCOUT = "scout"
    MERCHANT = "merchant"
    ARMY = "army"
    AGENT = "agent"
    NOBLE = "noble"
    DRIFTER = "drifter"
    SCHOLAR = "scholar"
    ROGUE = "rogue"
    CITIZEN = "citizen"
    ENTERTAINER = "entertainer"
    OTHER = "other"


class PortraitDistinguishingFeature(BaseModel):
    custom: str


class PortraitDemographics(BaseModel):
    gender: Optional[PortraitGender] = None
    age_range: Optional[PortraitAgeRange] = None
    skin_tone: Optional[PortraitSkinTone] = None
    eye_color: Optional[PortraitEyeColor] = None
    hair_color: Optional[PortraitHairColor] = None
    hair_style: Optional[PortraitHairStyle] = None


class PortraitPhysical(BaseModel):
    build: Optional[PortraitBuild] = None
    height: Optional[PortraitHeight] = None
    distinguishing_features: Optional[list[PortraitDistinguishingFeature | str]] = None


class PortraitCareer(BaseModel):
    career_type: Optional[PortraitCareerType] = None
    rank_level: Optional[PortraitRankLevel] = None
    career_style: Optional[PortraitCareerStyle] = None


class PortraitTraits(BaseModel):
    demeanor: Optional[PortraitDemeanor] = None
    vibe: Optional[PortraitVibe] = None


class PortraitBackground(BaseModel):
    homeworld_type: Optional[PortraitHomeworldType] = None
    social_class: Optional[PortraitSocialClass] = None


class PortraitStory(BaseModel):
    entity_type: PortraitEntityType
    relationship_type: Optional[PortraitRelationshipType] = None
    importance_level: Optional[PortraitImportanceLevel] = None
    family_group: Optional[str] = None


class PortraitRendering(BaseModel):
    style: Optional[PortraitRenderStyle] = None
    framing: Optional[PortraitFraming] = None
    lighting: Optional[PortraitLighting] = None


class PortraitTags(BaseModel):
    demographics: Optional[PortraitDemographics] = None
    physical: Optional[PortraitPhysical] = None
    career: Optional[PortraitCareer] = None
    traits: Optional[PortraitTraits] = None
    background: Optional[PortraitBackground] = None
    story: PortraitStory
    rendering: Optional[PortraitRendering] = None
    freeform: Optional[list[str]] = None


class GeneratePortraitRequest(BaseModel):
    tags: PortraitTags
    appearance_text: Optional[str] = None
    reference_image_base64: Optional[str] = None
    reference_image_mime_type: Optional[str] = None
    prompt_delta: Optional[str] = None
    aspect_ratio: Optional[str] = "1:1"


class GeneratePortraitResponse(BaseModel):
    image_base64: str
    mime_type: str
    prompt_used: str
    model_id: str


class ExtractTagsRequest(BaseModel):
    appearance_text: str
    career: Optional[str] = None
    characteristics: Optional[dict[str, int]] = None
    entity_type: PortraitEntityType = PortraitEntityType.NPC


class ExtractTagsResponse(BaseModel):
    tags: PortraitTags
    confidence: dict[str, float] = {}
