import * as Discord from "discord.js";

import AudioManager, { JoinFailureTypes } from "../audio/AudioManager";
import { CustomSample } from "../../core/soundboard/CustomSample";
import EntranceManager from "../../core/data-managers/EntranceManager";
import ExitManager from "../../core/data-managers/ExitManager";
import Queue from "../../core/Queue";

/*
 * The following event handler handles how Soundbort automatically
 * leaves an empty voice channel
 */

export default function onVoiceStateUpdate() {
    return async (old_state: Discord.VoiceState, new_state: Discord.VoiceState): Promise<void> => {
        const client = old_state.client;
        if (!client.user) return;

        if (old_state.channelId !== new_state.channelId && new_state.member)
        {
            let exit = await ExitManager.findUserExit(new_state.member.user.id);
            if (exit && old_state.channelId)
            {
                let sample = await CustomSample.findById(exit.customSampleId);
                if (!sample)
                    return;

                Queue.enqueue({
                    guild: old_state.guild,
                    channel: old_state.guild.channels.cache.get(old_state.channelId)!,
                    sample
                });
            }

            let entrance = await EntranceManager.findUserEntrance(new_state.member.user.id);
            if (entrance && new_state.channelId)
            {
                let sample = await CustomSample.findById(entrance.customSampleId);
                if (!sample)
                    return;

                Queue.enqueue({
                    guild: new_state.guild,
                    channel: new_state.guild.channels.cache.get(new_state.channelId)!,
                    sample
                });
            }
        }

        // Gestion classique
        // const subscription = AudioManager.get(new_state.guild.id);
        // // if we don't know of such a voice connection, let it stop
        // if (!subscription) return;

        // if (old_state.id === client.user.id) {
        //     // if bot has disconnected or was kicked from a voice channel
        //     if (old_state.channelId && !new_state.channelId) {
        //         return subscription.destroy();
        //     }
        // } else if (!old_state.channelId) { // if wasn't in a voice channel to begin with, stop
        //     return;
        // }

        // const channel = new_state.guild.members.me?.voice.channel;
        // if (!channel) return;

        // if (channel.members.filter(m => !m.user.bot).size > 0) return;

        // return subscription.destroy();
    };
}
