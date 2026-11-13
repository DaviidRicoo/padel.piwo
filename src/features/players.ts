import type { Profile } from '@/data/types';
import type { I18n } from '@/i18n';

/** "Mano: derecha", "Lado: revés", only for what the player filled in. */
export function playingFacts(profile: Profile, i18n: I18n): string[] {
  const { t } = i18n;
  const hand = profile.hand === 'right' ? t('profileEdit.handRight') : profile.hand === 'left' ? t('profileEdit.handLeft') : null;
  const side =
    profile.courtSide === 'right'
      ? t('profileEdit.sideRight')
      : profile.courtSide === 'left'
        ? t('profileEdit.sideLeft')
        : profile.courtSide === 'both'
          ? t('profileEdit.sideBoth')
          : null;
  return [hand ? `${t('player.hand')}: ${hand.toLowerCase()}` : null, side ? `${t('player.side')}: ${side.toLowerCase()}` : null].filter(
    (x): x is string => !!x,
  );
}

/** City and playing facts on one line, or null when there is nothing to show. */
export function profileSubtitle(profile: Profile, i18n: I18n): string | null {
  const parts = [profile.city, ...playingFacts(profile, i18n)].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
