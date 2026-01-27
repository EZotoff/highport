import { MockUser, generateUserId } from '@planeshift/shared';
import { getRandomColor } from './awareness';

export interface ActiveCharacter {
  characterId: string;
  name: string;
}

export function getActiveCharacter(): ActiveCharacter | null {
  if (typeof window !== 'undefined') {
    const storedJson = localStorage.getItem('planeshift_active_character');
    return storedJson ? JSON.parse(storedJson) : null;
  }
  return null;
}

export function getOrCreateUser(): MockUser {
  let gmPromotion = false;
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    gmPromotion = urlParams.get('gm') === 'true';
  }

  let user: MockUser | null = null;
  
  if (typeof window !== 'undefined') {
    const storedJson = localStorage.getItem('planeshift_user');
    user = storedJson ? JSON.parse(storedJson) : null;
  }

  if (user) {
    if (gmPromotion && !user.isGM) {
      user.isGM = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('planeshift_user', JSON.stringify(user));
      }
    }
  } else {
    user = {
      userId: generateUserId(),
      name: 'Anonymous',
      color: getRandomColor(),
      isGM: gmPromotion,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('planeshift_user', JSON.stringify(user));
    }
  }

  return user;
}
