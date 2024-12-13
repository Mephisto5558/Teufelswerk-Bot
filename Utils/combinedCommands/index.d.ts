/* eslint camelcase: [error, { allow: [_] }] -- This casing is used to better display the commandName. */


export {
  ban_kick_mute,
  lock_unlock,
  setupMinigameChannel
};

declare function ban_kick_mute(this: ThisParameterType<SlashCommand['run']>, ...args: Parameters<SlashCommand['run']>): ReturnType<SlashCommand['run']>;
declare function lock_unlock(this: ThisParameterType<MixedCommand['run']>, ...args: Parameters<MixedCommand['run']>): ReturnType<MixedCommand['run']>;
declare function setupMinigameChannel(this: ThisParameterType<MixedCommand['run']>, ...args: Parameters<MixedCommand['run']>): ReturnType<MixedCommand['run']>;