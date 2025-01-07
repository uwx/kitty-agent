import type { At } from '@atcute/client/lexicons';
import { configureOAuth, createAuthorizationUrl, deleteStoredSession, finalizeAuthorization, getSession, listStoredSessions, OAuthUserAgent, resolveFromIdentity, type Session } from '@atcute/oauth-browser-client';
import { KittyAgent } from './index.js';
import { resolveHandleAnonymously } from './handles/resolve.js';
import { getDidAndPds } from './pds-helpers.js';

export class OAuthClient {
    private readonly scope: string;

    constructor({ clientId, redirectUri, scope }: {
        clientId: string,
        redirectUri: string,
        scope: string,
    }) {
        configureOAuth({
            metadata: {
                client_id: clientId,
                redirect_uri: redirectUri,
            },
        });
        this.scope = scope;
    }

    async oauthAuthenticate(handle: string) {
        const { identity, metadata } = await resolveFromIdentity(handle);
    
        // passing `identity` is optional,
        // it allows for the login form to be autofilled with the user's handle or DID
        const authUrl = await createAuthorizationUrl({
            metadata,
            identity,
            scope: this.scope,
        });
    
        console.log(authUrl);
    
        // recommended to wait for the browser to persist local storage before proceeding
        await new Promise(resolve => setTimeout(resolve, 200));
    
        // redirect the user to sign in and authorize the app
        document.location.href = authUrl.toString();
    
        // Time out after 100 seconds if the redirect doesn't go through for some reason
        await new Promise(reject => setTimeout(reject, 100000));
    
        throw new Error('Unreachable code');
    }

    async oauthAuthenticateOrRefresh(
        handle: string,
        refreshOnly: boolean,
    ) {
        let session: Session | undefined;
        try {
            session = await getSession(
                await resolveHandleAnonymously(handle),
                { allowStale: false },
            );
        } catch (err) {
            console.warn('Could not refresh session:', err);
        }
    
        console.log('seession', session);
    
        if (refreshOnly && !session) return undefined;
    
        if (!session) {
            await this.oauthAuthenticate(handle); // will not return
            throw new Error('Should never happen');
        }
    
        const oauthAgent = new OAuthUserAgent(session);
    
        return oauthAgent;
    }

    revokeSessions() {
        for (const session of listStoredSessions()) {
            deleteStoredSession(session);
        }
    }
}

function isTokenUsable({ token }: Session): boolean {
    const expires = token.expires_at;
    return expires == null || Date.now() + 60_000 <= expires;
}
