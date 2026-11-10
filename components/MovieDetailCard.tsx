import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';
import {
  CastMember, CrewMember, fetchMovieCredits, fetchMovieProviders, fetchMovieTrailer,
  Movie, MovieTrailer, WatchProvider,
} from '../lib/tmdb';
import { useUIStore } from '../store/ui';
import { CollapsibleSection } from './CollapsibleSection';
import { InlineLoader } from './InlineLoader';

function ActorCard({ actor }: { actor: CastMember }) {
  return (
    <View style={styles.actorCard}>
      {actor.profile_path ? (
        <Image source={{ uri: `https://image.tmdb.org/t/p/w185${actor.profile_path}` }} style={styles.actorPhoto} />
      ) : (
        <View style={[styles.actorPhoto, styles.actorPhotoPlaceholder]}>
          <Ionicons name="person" size={28} color={colors.textMuted} />
        </View>
      )}
      <Text style={styles.actorName} numberOfLines={1}>{actor.name}</Text>
      <Text style={styles.actorCharacter} numberOfLines={1}>{actor.character}</Text>
    </View>
  );
}

type Props = {
  movie: Movie;
  width: number;
  onJailed?: () => void;
  topPadding?: number;
  onMoreLikeThis?: (movie: Movie) => void; // når sat, erstatter den navigationen til /more-like-this
};

export function MovieDetailCard({ movie, width, onJailed, topPadding = 70, onMoreLikeThis }: Props) {
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
    <ScrollView style={{ width }} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
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
          onPress={() =>
            onMoreLikeThis
              ? onMoreLikeThis(movie)
              : router.push({ pathname: '/more-like-this', params: { movieId: String(movie.id), title: movie.title } } as any)
          }
        >
          <Ionicons name="film-outline" size={16} color={colors.ink} />
          <Text style={styles.moreLikeThisText}>More like this</Text>
        </Pressable>

        <CollapsibleSection title="Description">
          <Text style={styles.overview}>{movie.overview || 'Ingen beskrivelse tilgængelig.'}</Text>
        </CollapsibleSection>

        <CollapsibleSection title="Crew">
          {loading ? <InlineLoader /> : (
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
              <Ionicons name="play-circle" size={22} color={colors.textOnDark} />
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
  content: { paddingBottom: 40, alignItems: 'center' },
  poster: { width: 200, height: 300, borderRadius: 16, marginBottom: spacing.lg },
  body: { width: '100%', paddingHorizontal: spacing.xl, alignItems: 'center' },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap', justifyContent: 'center' },
  meta: { ...typography.body },
  providerIcon: { width: 20, height: 20, borderRadius: 5 },
  moreLikeThisButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: colors.ink,
    borderRadius: 18, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.lg, backgroundColor: colors.background,
  },
  moreLikeThisText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  overview: { fontSize: 14, color: colors.textPrimary, lineHeight: 20, width: '100%' },
  directorText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10 },
  castScroll: { marginTop: spacing.xs },
  actorCard: { width: 80, marginRight: spacing.md, alignItems: 'center' },
  actorPhoto: { width: 70, height: 70, borderRadius: 35, marginBottom: 6 },
  actorPhotoPlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  actorName: { fontSize: 11, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  actorCharacter: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  trailerButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  trailerButtonText: { color: colors.textOnDark, fontSize: 14, fontWeight: '600' },
  verdictButton: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 18, width: '100%', alignItems: 'center', marginTop: spacing.md },
  verdictButtonText: { color: colors.textOnDark, fontSize: 18, fontWeight: '700' },
});