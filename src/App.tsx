import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { VerificationScreen } from './components/VerificationScreen';
import { JamSessionScreen } from './components/JamSessionScreen';
import { SoulMatchesScreen } from './components/SoulMatchesScreen';
import { SoulTikTokFeed } from './components/SoulTikTokFeed';
import { FunGamesScreen } from './components/FunGamesScreen';
import { VIPDashboardScreen } from './components/VIPDashboardScreen';
import { ProfileModal } from './components/ProfileModal';
import { CreatePostModal } from './components/CreatePostModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { WallpaperSelectorModal } from './components/WallpaperSelectorModal';
import { ShadowAdminBillingPortalModal } from './components/ShadowAdminBillingPortalModal';
import { GiftsStoreModal } from './components/GiftsStoreModal';
import { OpeningIntroModal } from './components/OpeningIntroModal';
import { DailyLoginRewardModal } from './components/DailyLoginRewardModal';
import { ReferralProgramModal } from './components/ReferralProgramModal';
import { AuthPortalModal, UserAccount } from './components/AuthPortalModal';
import { WarningStrikeModal } from './components/WarningStrikeModal';
import { AccountBannedModal } from './components/AccountBannedModal';
import { AppleAndroidInstallModal } from './components/AppleAndroidInstallModal';
import { OpeningLoveSongPlayer } from './components/OpeningLoveSongPlayer';
import { AdWatcherModal } from './components/AdWatcherModal';
import { AdsCenterModal } from './components/AdsCenterModal';
import { OwnerBackendConsole } from './components/OwnerBackendConsole';
import { OwnerClusterToastContainer } from './components/OwnerClusterToastContainer';
import { SoulProfile, WarningStrike, ActiveSubscriptionRecord } from './types';
import { BASIC_LIMITS } from './data/subscriptionData';
import {
  syncUserProfileWithGuardian,
  logoutOwnerBackend,
} from './services/aiGuardianService';
import { socketService } from './services/socket';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'beats' | 'reels' | 'singles' | 'vip' | 'verify'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('partyRoom') || params.get('coupleRoom')) {
          return 'home';
        }
        if (params.get('jamRoom') || params.get('jamSession')) {
          return 'beats';
        }
        const tab = params.get('tab');
        if (tab === 'singles' || tab === 'beats' || tab === 'reels' || tab === 'home' || tab === 'vip') {
          return tab;
        }
      }
    } catch {}
    return 'home';
  });

  const [initialPartyRoomCode] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('partyRoom');
        return code ? code.trim().toUpperCase() : null;
      }
    } catch {}
    return null;
  });

  const [initialCoupleRoomCode] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('coupleRoom');
        return code ? code.trim().toUpperCase() : null;
      }
    } catch {}
    return null;
  });

  const [initialCouplePlayMode] = useState<'online' | 'offline' | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('coupleMode');
        if (mode === 'offline' || mode === 'online') return mode;
      }
    } catch {}
    return null;
  });

  const [initialJamRoomId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const room = params.get('jamRoom') || params.get('jamSession');
        return room ? room.trim() : null;
      }
    } catch {}
    return null;
  });

  // Member Authentication & Registration State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('twogether_current_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default verified member (Dylan Wisney)
    return {
      id: 'usr_verified_1',
      name: 'Dylan Wisney',
      email: 'dylan.wisney@gmail.com',
      password: 'password123',
      passcode: '2026',
      securityQuestion: "What's your favorite meal?",
      securityAnswer: 'Pizza',
      isVerified: true,
      tier: 'basic',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      tagline: 'Music producer & tech innovator 🎧',
      age: 25,
      city: 'London',
    };
  });

  const [isVerified, setIsVerified] = useState<boolean>(() => currentUser?.isVerified ?? true);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false);
  const [selectedProfileForChat, setSelectedProfileForChat] = useState<SoulProfile | null>(null);

  // Handle shared deep links (e.g. ?tab=singles&profileId=... or ?tab=beats&jamSession=...)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const profileId = params.get('profileId');
        if (profileId) {
          fetch('/api/profiles')
            .then((res) => res.json())
            .then((data) => {
              if (data.profiles) {
                const matched = data.profiles.find((p: SoulProfile) => p.id === profileId);
                if (matched) {
                  setSelectedProfileForChat(matched);
                  setActiveTab('singles');
                }
              }
            })
            .catch(() => {});
        }
      }
    } catch {}
  }, []);

  // Auth Portal Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register' | 'forgot_password' | 'owner_login'>('login');

  // Opening Intro Short Clip State
  const [isIntroModalOpen, setIsIntroModalOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('twogether_intro_seen') !== 'true';
    } catch {
      return true;
    }
  });

  const handleCloseIntro = () => {
    setIsIntroModalOpen(false);
    try {
      sessionStorage.setItem('twogether_intro_seen', 'true');
    } catch {
      // ignore
    }
    // If user is a new member who has not logged in, guide them to registration!
    if (!currentUser) {
      setAuthInitialMode('register');
      setIsAuthModalOpen(true);
    }
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsVerified(user.isVerified);
    try {
      localStorage.setItem('twogether_current_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    if (!user.isVerified) {
      setActiveTab('verify');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsVerified(false);
    try {
      localStorage.removeItem('twogether_current_user');
    } catch {
      // ignore
    }
    setIsProfileOpen(false);
    setAuthInitialMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenAuth = (authMode?: 'login' | 'register' | 'forgot_password' | 'owner_login') => {
    setAuthInitialMode(authMode || 'login');
    setIsAuthModalOpen(true);
  };

  // Subscription, Gifts & Feature States
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscriptionRecord | null>(() => {
    try {
      const saved = localStorage.getItem('twogether_active_subscription');
      if (saved) {
        const parsed: ActiveSubscriptionRecord = JSON.parse(saved);
        if (parsed && parsed.expiresAtMs > Date.now()) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isVip, setIsVip] = useState<boolean>(() => {
    try {
      const subSaved = localStorage.getItem('twogether_active_subscription');
      if (subSaved) {
        const parsed = JSON.parse(subSaved);
        if (parsed && parsed.expiresAtMs > Date.now()) {
          return true;
        }
      }
      const saved = localStorage.getItem('twogether_is_vip');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleSubscriptionApproved = (sub: ActiveSubscriptionRecord) => {
    setActiveSubscription(sub);
    setIsVip(true);
    setIsVerified(true);
    setAdFreeUntil(sub.expiresAtMs);
    try {
      localStorage.setItem('twogether_active_subscription', JSON.stringify(sub));
      localStorage.setItem('twogether_is_vip', 'true');
      localStorage.setItem('twogether_is_verified', 'true');
      localStorage.setItem('twogether_ad_free_until', String(sub.expiresAtMs));
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, isVerified: true, tier: 'vip' as const };
        localStorage.setItem('twogether_current_user', JSON.stringify(updated));
        return updated;
      });
    } catch {}
  };

  const handleToggleVip = (status: boolean) => {
    setIsVip(status);
    try {
      localStorage.setItem('twogether_is_vip', String(status));
      if (status) {
        localStorage.setItem('twogether_is_verified', 'true');
        setIsVerified(true);
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, isVerified: true, tier: 'vip' as const };
          localStorage.setItem('twogether_current_user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch {}
  };

  const [postsUsed, setPostsUsed] = useState<number>(1);
  const [chatsUsed, setChatsUsed] = useState<number>(2);
  const [callsUsed, setCallsUsed] = useState<number>(1);
  const [activeWallpaperId, setActiveWallpaperId] = useState<string>('cyber_midnight');

  // Gifts Wallet State (Points are converted into Gifts: 25 Points = 1 Gift)
  const [giftsBalance, setGiftsBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_gifts_balance');
      if (saved !== null) return Number(saved);
    } catch {
      // ignore
    }
    return 25; // 25 valuable starting gifts
  });

  const [pointsBalance, setPointsBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_points_balance');
      if (saved !== null) return Number(saved);
    } catch {
      // ignore
    }
    return 120; // 120 earned points from determination
  });

  const [isGiftStoreOpen, setIsGiftStoreOpen] = useState<boolean>(false);
  const [isDailyRewardOpen, setIsDailyRewardOpen] = useState<boolean>(false);
  const [isReferralOpen, setIsReferralOpen] = useState<boolean>(false);
  const [unlockedFeatures, setUnlockedFeatures] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('twogether_unlocked_features');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Convert Points to Gifts: Fair & Reasonable Rate (25 Points = 1 Gift, 10 Days of 2.5 Pts/Day)
  const handleConvertPointsToGift = (pointsCost: number, giftsGained: number): boolean => {
    if (pointsBalance >= pointsCost) {
      const updatedPts = Number((pointsBalance - pointsCost).toFixed(1));
      const updatedGifts = giftsBalance + giftsGained;
      setPointsBalance(updatedPts);
      setGiftsBalance(updatedGifts);
      try {
        localStorage.setItem('twogether_points_balance', String(updatedPts));
        localStorage.setItem('twogether_gifts_balance', String(updatedGifts));
      } catch {}
      return true;
    }
    return false;
  };

  const handleEarnPoints = (amount: number, _reason: string) => {
    setPointsBalance((prev) => {
      const updated = Number((prev + amount).toFixed(1));
      try {
        localStorage.setItem('twogether_points_balance', String(updated));
      } catch {}
      return updated;
    });
  };

  const handleClaimDailyReward = (gifts: number, points: number) => {
    if (points > 0) handleEarnPoints(points, 'Daily Login Reward');
    if (gifts > 0) handleGenerateGifts(gifts, 'Milestone Streak Bonus');
  };

  // Anti-Nudity Moderation & 7-Strike Rule State (Apple & Android Compliance)
  const [warningStrikes, setWarningStrikes] = useState<WarningStrike[]>(() => {
    try {
      const saved = localStorage.getItem('twogether_warning_strikes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isBanned, setIsBanned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('twogether_is_banned') === 'true';
    } catch {
      return false;
    }
  });

  const [activeStrikeForModal, setActiveStrikeForModal] = useState<WarningStrike | null>(null);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState<boolean>(false);

  const handleReportViolation = (strikeInfo: { type: 'message' | 'post'; reason: string; snippet?: string }) => {
    const nextNum = warningStrikes.length + 1;
    const newStrike: WarningStrike = {
      id: `strike_${Date.now()}`,
      strikeNumber: nextNum,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contentType: strikeInfo.type,
      reason: strikeInfo.reason,
      previewSnippet: strikeInfo.snippet,
    };

    const updated = [...warningStrikes, newStrike];
    setWarningStrikes(updated);
    try {
      localStorage.setItem('twogether_warning_strikes', JSON.stringify(updated));
    } catch {}

    setActiveStrikeForModal(newStrike);
    setIsStrikeModalOpen(true);

    if (nextNum >= 7) {
      setIsBanned(true);
      try {
        localStorage.setItem('twogether_is_banned', 'true');
      } catch {}
    }
  };

  const handleRestoreBannedAccount = (_receipt: any) => {
    setIsBanned(false);
    setWarningStrikes([]);
    try {
      localStorage.setItem('twogether_is_banned', 'false');
      localStorage.setItem('twogether_warning_strikes', JSON.stringify([]));
    } catch {}
  };

  // Modals & Strict Owner-Only Back-End Authentication State
  const [ownerToken, setOwnerToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('twogether_owner_token');
    } catch {
      return null;
    }
  });
  const [ownerEmail, setOwnerEmail] = useState<string>(() => {
    try {
      return sessionStorage.getItem('twogether_owner_email') || 'dylanwisney@gmail.com';
    } catch {
      return 'dylanwisney@gmail.com';
    }
  });
  const [backendViewMode, setBackendViewMode] = useState<'frontend' | 'owner_backend'>('frontend');
  const [focusedHeatmapCellId, setFocusedHeatmapCellId] = useState<string | null>(null);
  const isAppOwner = Boolean(ownerToken);

  const handleOwnerAuthenticated = (token: string, email?: string) => {
    const resolvedEmail = (email || 'dylanwisney@gmail.com').trim().toLowerCase();
    setOwnerToken(token);
    setOwnerEmail(resolvedEmail);
    setBackendViewMode('owner_backend');
    try {
      sessionStorage.setItem('twogether_owner_token', token);
      sessionStorage.setItem('twogether_owner_email', resolvedEmail);
    } catch {}
  };

  const handleLogoutOwner = () => {
    if (ownerToken) {
      logoutOwnerBackend(ownerToken).catch(() => {});
    }
    socketService.leaveOwnerMonitor();
    setOwnerToken(null);
    setBackendViewMode('frontend');
    setFocusedHeatmapCellId(null);
    setIsAdminBillingPortalOpen(false);
    setIsAdsCenterOpen(false);
    try {
      sessionStorage.removeItem('twogether_owner_token');
      sessionStorage.removeItem('twogether_owner_email');
    } catch {}
  };

  // Keep active Front-End member synced with the Server AI Guardian Roster
  useEffect(() => {
    if (!currentUser) return;
    syncUserProfileWithGuardian({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      age: currentUser.age,
      location: currentUser.city || 'London',
      tagline: currentUser.tagline,
      avatar: currentUser.avatar,
      isVerified,
      tier: isVip || activeSubscription ? 'vip' : currentUser.tier || 'basic',
    }).catch(() => {});
  }, [currentUser?.id, currentUser?.name, currentUser?.tagline, isVerified, isVip, activeSubscription]);

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [subscriptionReason, setSubscriptionReason] = useState<string>('');
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState<boolean>(false);
  const [isAdminBillingPortalOpen, setIsAdminBillingPortalOpen] = useState<boolean>(false);
  const [isMobileInstallOpen, setIsMobileInstallOpen] = useState<boolean>(false);

  // Ad-Free Subscription & 5-Minute Ad Monetization State ($3.89/month)
  const [adFreeUntil, setAdFreeUntil] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_ad_free_until');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  // User has ad-free status if VIP or active 30-day Ad-Free subscription ($3.89/month) or active subscription
  const hasAdFreeSubscription =
    isVip ||
    (activeSubscription ? activeSubscription.expiresAtMs > Date.now() : false) ||
    Date.now() < adFreeUntil;

  // 5-Minute Ad Watcher Modal & Ads Center State
  const [isAdWatcherOpen, setIsAdWatcherOpen] = useState<boolean>(false);
  const [isAdsCenterOpen, setIsAdsCenterOpen] = useState<boolean>(false);
  const [, setAdSecondsRemaining] = useState<number>(300); // 5 minutes = 300 seconds

  // 5-minute interval timer: pop up ad if user has not subscribed or if subscription expired
  useEffect(() => {
    if (hasAdFreeSubscription) {
      // Subscribed users never see ads!
      setIsAdWatcherOpen(false);
      return;
    }

    const timer = setInterval(() => {
      setAdSecondsRemaining((prev) => {
        if (prev <= 1) {
          // 5 minutes reached! Show sponsored ad
          setIsAdWatcherOpen(true);
          // Increment impressions in Ads Center
          try {
            const currentImp = Number(localStorage.getItem('twogether_ad_impressions') || '1482') + 1;
            localStorage.setItem('twogether_ad_impressions', String(currentImp));
          } catch {}
          return 300; // Reset for next 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasAdFreeSubscription]);

  const handleUpgradeToAdFree = () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const newExpiry = Date.now() + thirtyDaysMs;
    setAdFreeUntil(newExpiry);
    try {
      localStorage.setItem('twogether_ad_free_until', String(newExpiry));
      const currentSubs = Number(localStorage.getItem('twogether_ad_subscribers') || '48') + 1;
      localStorage.setItem('twogether_ad_subscribers', String(currentSubs));
    } catch {}
    setIsAdWatcherOpen(false);
  };

  const handleOpenUpgradeModal = (reason?: string) => {
    setSubscriptionReason(reason || '');
    setIsSubscriptionModalOpen(true);
  };

  const handleOpenChatFromReel = (profile: SoulProfile) => {
    setSelectedProfileForChat(profile);
    setActiveTab('singles');
  };

  const handleBuyGiftsPack = (amount: number, _priceLabel: string) => {
    setGiftsBalance((prev) => {
      const updated = prev + amount;
      try {
        localStorage.setItem('twogether_gifts_balance', String(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleGenerateGifts = (amount: number, _reason: string) => {
    setGiftsBalance((prev) => {
      const updated = prev + amount;
      try {
        localStorage.setItem('twogether_gifts_balance', String(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleSpendGifts = (cost: number, _featureName: string, featureKey: string): boolean => {
    if (giftsBalance >= cost) {
      setGiftsBalance((prev) => {
        const updated = prev - cost;
        try {
          localStorage.setItem('twogether_gifts_balance', String(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      if (!unlockedFeatures.includes(featureKey)) {
        setUnlockedFeatures((prev) => {
          const updated = [...prev, featureKey];
          try {
            localStorage.setItem('twogether_unlocked_features', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
      return true;
    }
    return false;
  };

  const handleUnlockFeatureDirectly = (featureKey: string, _priceStr?: string) => {
    if (!unlockedFeatures.includes(featureKey)) {
      setUnlockedFeatures((prev) => {
        const updated = [...prev, featureKey];
        try {
          localStorage.setItem('twogether_unlocked_features', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  };

  const handleSendGiftToUser = (cost: number, _recipientName?: string): boolean => {
    if (giftsBalance >= cost) {
      setGiftsBalance((prev) => {
        const updated = prev - cost;
        try {
          localStorage.setItem('twogether_gifts_balance', String(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* Background Gradient Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Main App Navigation Bar */}
      <Navigation
        activeTab={activeTab === 'verify' ? 'home' : activeTab}
        setActiveTab={(tab) => setActiveTab(tab)}
        onOpenCreatePost={() => setIsCreatePostOpen(true)}
        onOpenChatList={() => setActiveTab('singles')}
        onOpenProfile={() => setIsProfileOpen(true)}
        isVerified={isVerified}
        isVip={isVip || !!activeSubscription}
        activeSubscription={activeSubscription}
        onOpenUpgradeModal={() => handleOpenUpgradeModal('Unlock Instant VIP via Google Pay')}
        giftsBalance={giftsBalance}
        pointsBalance={pointsBalance}
        onOpenGiftStore={() => setIsGiftStoreOpen(true)}
        onOpenDailyReward={() => setIsDailyRewardOpen(true)}
        onOpenReferral={() => setIsReferralOpen(true)}
        onOpenIntro={() => setIsIntroModalOpen(true)}
        onOpenAuthModal={() => handleOpenAuth('login')}
        isLoggedIn={!!currentUser}
        userAvatar={currentUser?.avatar}
        userName={currentUser?.name}
        strikesCount={warningStrikes.length}
        onOpenStrikesModal={() => {
          if (warningStrikes.length > 0) {
            setActiveStrikeForModal(warningStrikes[warningStrikes.length - 1]);
            setIsStrikeModalOpen(true);
          }
        }}
        onOpenMobileInstall={() => setIsMobileInstallOpen(true)}
        onOpenAdsCenter={isAppOwner ? () => setIsAdsCenterOpen(true) : undefined}
        isAppOwner={isAppOwner}
        backendViewMode={backendViewMode}
        onToggleBackendView={() =>
          setBackendViewMode((prev) => (prev === 'owner_backend' ? 'frontend' : 'owner_backend'))
        }
      />

      {/* View Screens — Strict Separation: Owner Back-End Console vs User Front-End */}
      <main className="relative z-10 pb-24 pt-2 px-2 sm:px-4">
        {isAppOwner && backendViewMode === 'owner_backend' && ownerToken ? (
          <OwnerBackendConsole
            ownerEmail={ownerEmail}
            ownerToken={ownerToken}
            focusedHeatmapCellId={focusedHeatmapCellId}
            onSwitchToFrontend={() => setBackendViewMode('frontend')}
            onLogoutOwner={handleLogoutOwner}
            onOpenBillingPortal={() => setIsAdminBillingPortalOpen(true)}
            onOpenAdsCenter={() => setIsAdsCenterOpen(true)}
          />
        ) : (
          <>
            {activeTab === 'verify' && (
              <VerificationScreen
                isVerified={isVerified}
                userId={currentUser?.id}
                userEmail={currentUser?.email}
                onVerificationComplete={() => {
                  setIsVerified(true);
                  try {
                    localStorage.setItem('twogether_is_verified', 'true');
                  } catch {}
                  setCurrentUser((prev) => {
                    if (!prev) return prev;
                    const updated = { ...prev, isVerified: true };
                    localStorage.setItem('twogether_current_user', JSON.stringify(updated));
                    return updated;
                  });
                  setActiveTab('singles');
                }}
                onOpenUpgradeModal={() => handleOpenUpgradeModal('Unlock Instant Auto-Verify Status via VIP')}
              />
            )}

            {activeTab === 'home' && (
              <FunGamesScreen
                onStartIcebreaker={() => setActiveTab('singles')}
                onOpenSharedBeats={() => setActiveTab('beats')}
                isVip={isVip}
                onOpenUpgradeModal={handleOpenUpgradeModal}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
                currentUserEmail={currentUser?.email}
                onReportViolation={handleReportViolation}
                initialPartyRoomCode={initialPartyRoomCode}
                initialCoupleRoomCode={initialCoupleRoomCode}
                initialCouplePlayMode={initialCouplePlayMode}
              />
            )}

            {activeTab === 'beats' && (
              <JamSessionScreen
                initialRoomId={initialJamRoomId}
                currentUserName={currentUser?.name}
                currentUserAvatar={currentUser?.avatar}
              />
            )}

            {activeTab === 'reels' && (
              <SoulTikTokFeed
                onOpenChatWithProfile={handleOpenChatFromReel}
                onOpenProfileModal={() => setIsProfileOpen(true)}
                giftsBalance={giftsBalance}
                onSendGift={handleSendGiftToUser}
                onOpenGiftStore={() => setIsGiftStoreOpen(true)}
                onReportViolation={handleReportViolation}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
                currentUserEmail={currentUser?.email}
              />
            )}

            {activeTab === 'singles' && (
              <SoulMatchesScreen
                initialChatProfile={selectedProfileForChat}
                isVerified={isVerified}
                onStartVerification={() => setActiveTab('verify')}
                isVip={isVip}
                chatsUsed={chatsUsed}
                maxChatsBasic={BASIC_LIMITS.chats.max}
                chatsDaysInterval={BASIC_LIMITS.chats.days}
                callsUsed={callsUsed}
                maxCallsBasic={BASIC_LIMITS.calls.max}
                callsDaysInterval={BASIC_LIMITS.calls.days}
                onIncrementChats={() => setChatsUsed((prev) => prev + 1)}
                onIncrementCalls={() => setCallsUsed((prev) => prev + 1)}
                onOpenUpgradeModal={handleOpenUpgradeModal}
                activeWallpaperId={activeWallpaperId}
                onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
                unlockedFeatures={unlockedFeatures}
                giftsBalance={giftsBalance}
                onSpendGifts={handleSpendGifts}
                onUnlockFeatureDirectly={handleUnlockFeatureDirectly}
                onReportViolation={handleReportViolation}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
                currentUserEmail={currentUser?.email}
              />
            )}

            {activeTab === 'vip' && (
              <VIPDashboardScreen
                onOpenSingleSouls={() => setActiveTab('singles')}
                isVip={isVip || !!activeSubscription}
                activeSubscription={activeSubscription}
                postsUsed={postsUsed}
                chatsUsed={chatsUsed}
                callsUsed={callsUsed}
                onOpenUpgradeModal={() => handleOpenUpgradeModal()}
                onToggleVip={() => setIsVip(!isVip)}
                onOpenAdminBillingPortal={isAppOwner ? () => setIsAdminBillingPortalOpen(true) : undefined}
                isAppOwner={isAppOwner}
                onOpenAdsCenter={isAppOwner ? () => setIsAdsCenterOpen(true) : undefined}
              />
            )}
          </>
        )}
      </main>

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        isVerified={isVerified}
        onStartVerification={() => {
          setIsProfileOpen(false);
          setActiveTab('verify');
        }}
        isVip={isVip}
        onOpenUpgradeModal={handleOpenUpgradeModal}
        postsUsed={postsUsed}
        maxPostsBasic={BASIC_LIMITS.posts.max}
        postsDaysInterval={BASIC_LIMITS.posts.days}
        chatsUsed={chatsUsed}
        maxChatsBasic={BASIC_LIMITS.chats.max}
        chatsDaysInterval={BASIC_LIMITS.chats.days}
        callsUsed={callsUsed}
        maxCallsBasic={BASIC_LIMITS.calls.max}
        callsDaysInterval={BASIC_LIMITS.calls.days}
        onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
        onOpenAdminBillingPortal={isAppOwner ? () => setIsAdminBillingPortalOpen(true) : undefined}
        giftsBalance={giftsBalance}
        onOpenGiftStore={() => setIsGiftStoreOpen(true)}
        isAppOwner={isAppOwner}
        onOpenIntroModal={() => setIsIntroModalOpen(true)}
        onLogout={handleLogout}
        onOpenAuthModal={handleOpenAuth}
        currentUserId={currentUser?.id}
        currentUserEmail={currentUser?.email}
        onReportViolation={handleReportViolation}
      />

      {/* Gifts Store & Feature Store Modal */}
      <GiftsStoreModal
        isOpen={isGiftStoreOpen}
        onClose={() => setIsGiftStoreOpen(false)}
        giftsBalance={giftsBalance}
        pointsBalance={pointsBalance}
        unlockedFeatures={unlockedFeatures}
        onBuyGiftsPack={handleBuyGiftsPack}
        onSpendGifts={handleSpendGifts}
        onConvertPointsToGift={handleConvertPointsToGift}
        onGeneratePoints={handleEarnPoints}
        onGenerateGifts={handleGenerateGifts}
        onSendGiftToUser={(_rec, _gift, cost) => handleSpendGifts(cost, 'Gift Sent', `gift_${Date.now()}`)}
        isVip={isVip}
        onToggleVip={(status) => setIsVip(status)}
        onUnlockFeatureDirectly={handleUnlockFeatureDirectly}
      />

      {/* 24-Hour Daily Login Orbit Reward Modal (2.5 Points / Day) */}
      <DailyLoginRewardModal
        isOpen={isDailyRewardOpen}
        onClose={() => setIsDailyRewardOpen(false)}
        onClaimReward={handleClaimDailyReward}
        pointsBalance={pointsBalance}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => {
          setActiveTab('reels');
        }}
        isVip={isVip}
        postsUsed={postsUsed}
        maxPostsBasic={BASIC_LIMITS.posts.max}
        postsDaysInterval={BASIC_LIMITS.posts.days}
        onOpenUpgradeModal={handleOpenUpgradeModal}
        onIncrementPosts={() => setPostsUsed((prev) => prev + 1)}
        unlockedFeatures={unlockedFeatures}
        giftsBalance={giftsBalance}
        onSpendGifts={handleSpendGifts}
        onUnlockFeatureDirectly={handleUnlockFeatureDirectly}
        onReportViolation={handleReportViolation}
        currentUserId={currentUser?.id}
        currentUserName={currentUser?.name}
        currentUserEmail={currentUser?.email}
      />

      {/* Community Safety Warning Strike Modal (1-6 Strikes) */}
      <WarningStrikeModal
        isOpen={isStrikeModalOpen}
        onClose={() => setIsStrikeModalOpen(false)}
        strike={activeStrikeForModal}
        totalStrikes={warningStrikes.length}
      />

      {/* Account Banned & $10 Appeal Fine Modal (7 Strikes Reached) */}
      <AccountBannedModal
        isOpen={isBanned}
        banState={{
          isBanned,
          strikesCount: warningStrikes.length,
          strikes: warningStrikes,
          banReason: 'Account suspended for exceeding 7 community safety warning strikes (Anti-Nudity Policy).',
        }}
        userEmail={currentUser?.email}
        userName={currentUser?.name}
        onRestoreAccount={handleRestoreBannedAccount}
      />

      {/* VIP Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        isVip={isVip || !!activeSubscription}
        activeSubscription={activeSubscription}
        onSubscriptionApproved={handleSubscriptionApproved}
        onToggleVip={(status) => handleToggleVip(status)}
        onDowngradeToBasic={() => handleToggleVip(false)}
        reasonMessage={subscriptionReason}
        onOpenReferral={() => setIsReferralOpen(true)}
      />

      {/* Referral Program Modal (Refer a Friend & Earn 10 Points) */}
      <ReferralProgramModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        onEarnPoints={handleEarnPoints}
        pointsBalance={pointsBalance}
        userName={currentUser?.name}
        onOpenGiftsStore={() => setIsGiftStoreOpen(true)}
      />

      {/* Wallpaper Selector Modal */}
      <WallpaperSelectorModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        activeWallpaperId={activeWallpaperId}
        onSelectWallpaper={(id) => setActiveWallpaperId(id)}
        isVip={isVip}
        onOpenUpgradeModal={handleOpenUpgradeModal}
        unlockedFeatures={unlockedFeatures}
        giftsBalance={giftsBalance}
        onSpendGifts={handleSpendGifts}
        onUnlockFeatureDirectly={handleUnlockFeatureDirectly}
      />

      {/* Shadow Admin Paying & Billing Portal Modal — Strictly Owner Only */}
      {isAppOwner && (
        <ShadowAdminBillingPortalModal
          isOpen={isAdminBillingPortalOpen}
          onClose={() => setIsAdminBillingPortalOpen(false)}
          isAppOwner={isAppOwner}
          ownerToken={ownerToken}
          adminEmail={ownerEmail}
          onOwnerAuthenticated={(tok, em) => {
            if (tok) handleOwnerAuthenticated(tok, em);
          }}
        />
      )}

      {/* Opening Intro Short Clip Modal (Direct playback without tap-to-enter) */}
      <OpeningIntroModal
        isOpen={isIntroModalOpen}
        onClose={handleCloseIntro}
      />

      {/* Member Authentication, Registration & Account Recovery Portal */}
      <AuthPortalModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authInitialMode}
        onOpenUpgradeModal={() => {
          setIsAuthModalOpen(false);
          handleOpenUpgradeModal('Unlock Instant Auto-Verify Status via VIP');
        }}
        onOwnerAuthenticated={handleOwnerAuthenticated}
      />

      {/* Apple iPhone & Android Phone Store Ready & Install Modal */}
      <AppleAndroidInstallModal
        isOpen={isMobileInstallOpen}
        onClose={() => setIsMobileInstallOpen(false)}
      />

      {/* Opening Trending International & Kenyan Love Songs Player */}
      <OpeningLoveSongPlayer
        onOpenJamSession={() => setActiveTab('beats')}
      />

      {/* 5-Minute Sponsored Ad Watcher Modal (Escaped via $3.89/mo Subscription) */}
      <AdWatcherModal
        isOpen={isAdWatcherOpen}
        onClose={() => setIsAdWatcherOpen(false)}
        onUpgradeToAdFree={handleUpgradeToAdFree}
        onEarnPoints={handleEarnPoints}
        hasAdFreeSubscription={hasAdFreeSubscription}
      />

      {/* Owner Monetization & Ad Revenue Center — Strictly Owner Only */}
      {isAppOwner && (
        <AdsCenterModal
          isOpen={isAdsCenterOpen}
          onClose={() => setIsAdsCenterOpen(false)}
          ownerEmail={ownerEmail}
          onTriggerTestAd={() => setIsAdWatcherOpen(true)}
        />
      )}

      {/* Real-Time AI Bad Vibe Cluster Toast Notifications — Strictly Owner Only */}
      {isAppOwner && ownerToken && (
        <OwnerClusterToastContainer
          ownerToken={ownerToken}
          onInspectInHeatmap={(zoneId, category) => {
            setFocusedHeatmapCellId(`${zoneId}__${category}`);
            setBackendViewMode('owner_backend');
          }}
        />
      )}
    </div>
  );
}
