export type PortraitSourcePolicy = 'subject_only' | 'family_only' | 'campaign' | 'public';

export type PortraitEntityType = 'traveller' | 'npc';

export type PortraitGender = 'female' | 'male' | 'nonbinary' | 'ambiguous';
export type PortraitAgeRange = 'child' | 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'elder';
export type PortraitSkinTone = 'very_fair' | 'fair' | 'medium' | 'olive' | 'brown' | 'dark';
export type PortraitEyeColor = 'brown' | 'hazel' | 'green' | 'blue' | 'gray' | 'amber';
export type PortraitHairColor = 'black' | 'brown' | 'blonde' | 'red' | 'gray' | 'white' | 'dyed';
export type PortraitHairStyle =
  | 'buzzcut'
  | 'short'
  | 'medium'
  | 'long'
  | 'bald'
  | 'ponytail'
  | 'braids'
  | 'afro'
  | 'wavy'
  | 'curly';
export type PortraitBuild = 'slim' | 'average' | 'athletic' | 'stocky' | 'heavy';
export type PortraitHeight = 'short' | 'average' | 'tall';
export type PortraitRankLevel = 'low' | 'mid' | 'high';
export type PortraitCareerStyle = 'uniformed' | 'civilian' | 'corporate' | 'street' | 'formal';
export type PortraitDemeanor = 'calm' | 'stern' | 'friendly' | 'aloof' | 'nervous' | 'aggressive';
export type PortraitVibe = 'trustworthy' | 'menacing' | 'mysterious' | 'eccentric' | 'professional';
export type PortraitHomeworldType =
  | 'high_tech'
  | 'industrial'
  | 'frontier'
  | 'agricultural'
  | 'underclass'
  | 'rich_core';
export type PortraitSocialClass = 'low' | 'middle' | 'upper' | 'noble';
export type PortraitRelationshipType =
  | 'ally'
  | 'enemy'
  | 'neutral'
  | 'patron'
  | 'contact'
  | 'family'
  | 'rival';
export type PortraitImportanceLevel = 'extra' | 'supporting' | 'key';
export type PortraitRenderStyle = 'realistic' | 'painterly' | 'cinematic' | 'comic';
export type PortraitFraming = 'headshot' | 'bust' | 'full_body';
export type PortraitLighting = 'neutral' | 'dramatic' | 'low_key' | 'high_key';

export type PortraitDistinguishingFeature =
  | 'scar'
  | 'tattoo'
  | 'cybernetic_implant'
  | 'piercing'
  | 'missing_eye'
  | 'burn_marks'
  | 'freckles'
  | 'beard'
  | 'mustache'
  | { custom: string };

export type PortraitCareerType =
  | 'navy'
  | 'marines'
  | 'scout'
  | 'merchant'
  | 'army'
  | 'agent'
  | 'noble'
  | 'drifter'
  | 'scholar'
  | 'rogue'
  | 'citizen'
  | 'entertainer'
  | 'other';

export interface PortraitTags {
  demographics?: {
    gender?: PortraitGender;
    age_range?: PortraitAgeRange;
    skin_tone?: PortraitSkinTone;
    eye_color?: PortraitEyeColor;
    hair_color?: PortraitHairColor;
    hair_style?: PortraitHairStyle;
  };
  physical?: {
    build?: PortraitBuild;
    height?: PortraitHeight;
    distinguishing_features?: PortraitDistinguishingFeature[];
  };
  career?: {
    career_type?: PortraitCareerType;
    rank_level?: PortraitRankLevel;
    career_style?: PortraitCareerStyle;
  };
  traits?: {
    demeanor?: PortraitDemeanor;
    vibe?: PortraitVibe;
  };
  background?: {
    homeworld_type?: PortraitHomeworldType;
    social_class?: PortraitSocialClass;
  };
  story: {
    entity_type: PortraitEntityType;
    relationship_type?: PortraitRelationshipType;
    importance_level?: PortraitImportanceLevel;
    family_group?: string;
  };
  rendering?: {
    style?: PortraitRenderStyle;
    framing?: PortraitFraming;
    lighting?: PortraitLighting;
  };
  freeform?: string[];
}

export interface PortraitRecord {
  id: string;
  campaign_id: string;
  subject_node_id?: string;
  anchor_portrait_id?: string;
  source_portrait_id?: string;
  family_group_id?: string;
  protected: boolean;
  source_policy: PortraitSourcePolicy;
  tags: PortraitTags;
  prompt?: string;
  prompt_fingerprint?: string;
  model_id?: string;
  storage_key: string;
  mime_type: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
}

export interface PortraitSearchResult {
  portrait: PortraitRecord;
  score: number;
  score_breakdown: Record<string, number>;
}
