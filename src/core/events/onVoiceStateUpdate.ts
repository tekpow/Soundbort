import * as Discord from "discord.js";

import AudioManager, { JoinFailureTypes } from "../audio/AudioManager";
import { CustomSample } from "../../core/soundboard/CustomSample";
import EntranceManager from "../../core/data-managers/EntranceManager";

/*
 * The following event handler handles how Soundbort automatically
 * leaves an empty voice channel
 */

export default function onVoiceStateUpdate() {
    return async (old_state: Discord.VoiceState, new_state: Discord.VoiceState): Promise<void> => {
        const client = old_state.client;
        if (!client.user) return;

        // TODO: Gérer l'exit quand le système de queue sera implémenté
        if (new_state.channelId && old_state.channelId !== new_state.channelId)
        {
            if (new_state.member)
            {
                let entrance = await EntranceManager.findUserEntrance(new_state.member.user.id);
                if (entrance)
                {
                    let sample = await CustomSample.findById(entrance.customSampleId);

                    let subscription = await AudioManager.join(new_state.member);
                    if (subscription === JoinFailureTypes.FailedNotInVoiceChannel ||
                        subscription === JoinFailureTypes.FailedTryAgain)
                    {
                        console.log("Failed to join voice channel");
                        return;
                    }

                    sample!.play(subscription.audio_player);
                }                
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
