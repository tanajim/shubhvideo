import {
    Answer,
    IceCandidate,
    MediaPeer,
    Offer,
    Signaler,
} from '../../../js/rtcclient';

describe('Test ideoPeer', () => {
    it('can initialize a connection', () => {
        const signaler = new MockSignaler();
        const peer = new MediaPeer(
            { id: 'abc', username: 'Bill' },
            signaler,
            false
        );

        expect(peer.id).to.equal('abc');
        expect(peer.username).to.equal('Bill');
        expect(peer.polite).to.equal(false);
        expect(peer.connection).to.be.instanceOf(RTCPeerConnection);
    });

    it(
        'can negotiate a connection',
        {
            defaultCommandTimeout: 10000,
            retries: 2,
        },
        () => {
            const signaler = new MockSignaler();
            const peer1 = new MediaPeer(
                { id: 'abc', username: 'Bill' },
                signaler,
                false
            );
            const peer2 = new MediaPeer(
                { id: 'def', username: 'Ted' },
                signaler,
                true
            );

            // Note: the mapping between id and peer appears reversed here since the
            // id refers to the other peer
            signaler.peers.set(peer2.id, peer1);
            signaler.peers.set(peer1.id, peer2);

            // Begin negotiation
            peer1.connect();
            peer2.connect();

            // Retry assertions until connection is established (or Cypress times out)
            cy.wrap(peer1).should(
                'have.property',
                'connectionState',
                'connected'
            );
            cy.wrap(peer2).should(
                'have.property',
                'connectionState',
                'connected'
            );
            cy.wrap(peer1).should(
                'have.property',
                'iceConnectionState',
                'connected'
            );
            cy.wrap(peer2).should(
                'have.property',
                'iceConnectionState',
                'connected'
            );
        }
    );

    it('can add multiple audio and video tracks', () => {
        const peer = createDummyPeer();
        const videoTrackA = createVideoTrack();
        const videoTrackB = createVideoTrack();
        const audioTrackA = createAudioTrack();
        const audioTrackB = createAudioTrack();

        peer.addTrack(videoTrackA);
        peer.addTrack(videoTrackB);
        peer.addTrack(audioTrackA);
        peer.addTrack(audioTrackB);

        const peerTracks = peer.getTracks();
        expect(peerTracks).includes(videoTrackA);
        expect(peerTracks).includes(videoTrackB);
        expect(peerTracks).includes(audioTrackA);
        expect(peerTracks).includes(audioTrackB);
    });

    it('can add and remove a track', () => {
        const peer = createDummyPeer();
        const track = createVideoTrack();

        peer.addTrack(track);
        expect(peer.getTracks()).includes(track);

        peer.removeTrack(track.id);
        expect(peer.getTracks()).to.not.includes(track);
    });

    it('can add and replace a track', async () => {
        const peer = createDummyPeer();
        const trackA = createVideoTrack();
        const trackB = createVideoTrack();

        peer.addTrack(trackA);
        expect(peer.getTracks()).includes(trackA);

        await peer.replaceTrack(trackA.id, trackB);
        expect(peer.getTracks()).not.to.include(trackA);
        expect(peer.getTracks()).includes(trackB);
    });
});

class MockSignaler extends Signaler {
    peers: Map<string, MediaPeer>;

    constructor() {
        super();
        this.peers = new Map();
    }

    offer(receiver: string, description: Offer) {
        this.peers.get(receiver).onOffer(description).then();
    }

    answer(receiver: string, description: Answer) {
        this.peers.get(receiver).onAnswer(description).then();
    }

    icecandidate(receiver: string, candidate: IceCandidate) {
        this.peers.get(receiver).onIceCandidate(candidate).then();
    }
}

function createVideoTrack(): MediaStreamTrack {
    return new RTCPeerConnection().addTransceiver('video').receiver.track;
}

function createAudioTrack(): MediaStreamTrack {
    return new RTCPeerConnection().addTransceiver('audio').receiver.track;
}

function createDummyPeer(): MediaPeer {
    const signaler = new MockSignaler();
    const peer = new MediaPeer(
        { id: 'abc', username: 'Bill' },
        signaler,
        false
    );
    peer.connection.onnegotiationneeded = () => {}; // Disable negotiation for this test
    peer.connect(); // Trigger setup of transceivers
    return peer;
}
