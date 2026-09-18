import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    CastMember, CrewMember, fetchMovieCredits, fetchMovieProviders, fetchMovieTrailer,
    Movie, MovieTrailer, WatchProvider,
} from '../lib/tmdb';
import { useUIStore } from '../store/ui';
import { CollapsibleSection } from './CollapsibleSection';

function ActorCard({ actor }: { actor: CastMember }) {
  return (
    <View style={styles.actorCard}>
      {actor.profile_path ? (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w185${actor.profile_path}` }} style={styles.actorPhoto} />
      ) : (
        <View style={[styles.actorPhoto, styles.actorPhotoPlaceholder]}>
          <Ionicons name="person" size={28} color="#8A8A8A" />
        </View>
      )}
      <Text style={styles.actorName} numberOfLines={1}>{actor.name}</Text>
      <Text style={styles.actorCharacter} numberOfLines={1}>{actor.character}</Text>
    </View>
  );
}

type Props = { movie: Movie; width: number; onJailed?: () => void };

export function MovieDetailCard({ movie, width, onJailed }: Props) {
  const [director, setDirector] = useState<CrewMember | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [trailer, setTrailer] = useState<MovieTrailer | null>(null);
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const openActionModal = useUIStore((state) => state.openActionModal);

  useEffect(() => {
    Promise.all([fetchMovieCredits(movie.id), fetchMovieTrailer(movie.id), fetchMovieProviders(movie.id, null)])
      .then(([credits, trailerData, providerData]) => {
        setDirector(credits.director);
        setCast(credits.cast);
        setTrailer(trailerData);
        setProviders(providerData);
      })
      .finally(() => setLoading(false));
  }, [movie.id]);

  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.content}>
      {movie.poster_path && (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }} style={styles.poster} />
      )}

      <View style={styles.body}>
        <Text style={styles.title}>{movie.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{movie.release_date?.slice(0, 4)} · ⭐ {movie.vote_average.toFixed(1)}</Text>
          {providers.slice(0, 5).map((p) => p.logo_path && (
            <Image key={p.provider_id} source={{ uri: `https://image.tmdb.org/t/p/w45${p.logo_path}` }} style={styles.providerIcon} />
          ))}
        </View>

        <Pressable
          style={styles.moreLikeThisButton}
          onPress={() => router.push({ pathname: '/more-like-this', params: { movieId: String(movie.id), title: movie.title } } as any)}
        >
          <Ionicons name="film-outline" size={16} color="#1A1A1A" />
          <Text style={styles.moreLikeThisText}>More like this</Text>
        </Pressable>

        <CollapsibleSection title="Description">
          <Text style={styles.overview}>{movie.overview || 'Ingen beskrivelse tilgængelig.'}</Text>
        </CollapsibleSection>

        <CollapsibleSection title="Crew">
          {loading ? <ActivityIndicator color="#1A1A1A" /> : (
            <>
              {director && <Text style={styles.directorText}>Instruktør: {director.name}</Text>}
              {cast.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.castScroll}>
                  {cast.map((actor) => <ActorCard key={actor.id} actor={actor} />)}
                </ScrollView>
              ) : (
                <Text style={styles.overview}>Ingen skuespiller-data tilgængelig.</Text>
              )}
            </>
          )}
        </CollapsibleSection>

        {trailer && (
          <CollapsibleSection title="Trailer">
            <Pressable style={styles.trailerButton} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`)}>
              <Ionicons name="play-circle" size={22} color="#FFFFFF" />
              <Text style={styles.trailerButtonText}>Se trailer på YouTube</Text>
            </Pressable>
          </CollapsibleSection>
        )}

        <Pressable style={styles.verdictButton} onPress={() => openActionModal(movie, onJailed)}>
          <Text style={styles.verdictButtonText}>My Verdict</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 70, paddingBottom: 40, alignItems: 'center' },
  poster: { width: 200, height: 300, borderRadius: 16, marginBottom: 16 },
  body: { width: '100%', paddingHorizontal: 20, alignItems: 'center' },
  title: { fontFamily: 'Gabarito-Bold', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' },
  meta: { fontSize: 15, color: '#1A1A1A' },
  providerIcon: { width: 20, height: 20, borderRadius: 5 },
  moreLikeThisButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: '#1A1A1A',
    borderRadius: 18, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 16, backgroundColor: '#E8B923',
  },
  moreLikeThisText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  overview: { fontSize: 14, color: '#1A1A1A', lineHeight: 20, width: '100%' },
  directorText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  castScroll: { marginTop: 4 },
  actorCard: { width: 80, marginRight: 12, alignItems: 'center' },
  actorPhoto: { width: 70, height: 70, borderRadius: 35, marginBottom: 6 },
  actorPhotoPlaceholder: { backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  actorName: { fontSize: 11, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  actorCharacter: { fontSize: 10, color: '#5A5A5A', textAlign: 'center' },
  trailerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1A1A', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
  trailerButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  verdictButton: { backgroundColor: '#1A1A1A', borderRadius: 40, paddingVertical: 18, width: '100%', alignItems: 'center', marginTop: 12 },
  verdictButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});