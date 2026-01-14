import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

// --- Helper: Time Ago Formatter ---
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "Just now";
};

export default function PostDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialItem = params.item ? JSON.parse(params.item) : null;

  // Data State
  const [item, setItem] = useState(initialItem);
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Input State
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Context State (Replying/Editing)
  const [replyingTo, setReplyingTo] = useState(null); // Object: { id, user_name }
  const [editingComment, setEditingComment] = useState(null); // Object: { id, content }
  const inputRef = useRef(null);

  // Rating State
  const [userRating, setUserRating] = useState(initialItem?.rating || 0);
  const [isRating, setIsRating] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (item?.id) {
        await fetchFreshTourData();
        fetchComments();
      }
    };
    initData();
  }, []);

  // 1. Fetch latest tour data (for accurate rating)
  const fetchFreshTourData = async () => {
    const { data } = await supabase.from('tours').select('*').eq('id', initialItem.id).single();
    if (data) {
      setItem(data);
      setUserRating(data.rating);
    }
  };

  // 2. Fetch comments (ordered oldest to newest for conversations)
  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('tour_id', initialItem.id)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  // 3. Handle Rating
  const handleRate = async (stars) => {
    if (isRating) return;
    setIsRating(true);
    setUserRating(stars); // Optimistic update

    const { error } = await supabase
      .from('tours')
      .update({ rating: stars })
      .eq('id', item.id);

    setIsRating(false);
    if (error) {
      Alert.alert("Error", "Could not save rating");
      setUserRating(item.rating); // Revert
    }
  };

  // 4. Handle Submit (Create, Reply, Edit)
  const handleSubmit = async () => {
    if (!inputText.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (editingComment) {
        // --- EDIT MODE ---
        const { error } = await supabase
          .from('comments')
          .update({ content: inputText })
          .eq('id', editingComment.id);
        
        if (error) throw error;

      } else {
        // --- CREATE / REPLY MODE ---
        const payload = {
          tour_id: item.id,
          content: inputText,
          user_id: currentUser.id, // ✅ Crucial for RLS
          user_name: currentUser?.user_metadata?.full_name || 'Traveler',
          parent_id: replyingTo ? replyingTo.id : null
        };

        const { error } = await supabase.from('comments').insert(payload);
        if (error) throw error;
      }

      // Reset UI
      setInputText('');
      setReplyingTo(null);
      setEditingComment(null);
      Keyboard.dismiss();
      await fetchComments(); // Refresh list

    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Comment
  const handleDeleteComment = (commentId) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          const { error } = await supabase.from('comments').delete().eq('id', commentId);
          if (!error) fetchComments();
          else Alert.alert("Error", error.message);
        }
      }
    ]);
  };

  // 6. Setup Input for Reply
  const initReply = (comment) => {
    setEditingComment(null);
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  // 7. Setup Input for Edit
  const initEdit = (comment) => {
    setReplyingTo(null);
    setEditingComment(comment);
    setInputText(comment.content);
    inputRef.current?.focus();
  };

  // --- Helper: Filter Comments Tree ---
  // We get a flat list. We render roots, and roots render their children.
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  // --- Component: Single Comment ---
  const CommentItem = ({ comment, isReply = false }) => {
    const isOwner = currentUser?.id === comment.user_id;

    return (
      <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>{comment.user_name}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
        </View>
        
        <Text style={styles.commentText}>{comment.content}</Text>
        
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => initReply(comment)}>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>

          {isOwner && (
            <>
              <TouchableOpacity onPress={() => initEdit(comment)}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                <Text style={[styles.actionText, { color: '#FF4D4D' }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Recursive Replies */}
        {!isReply && getReplies(comment.id).map(reply => (
           <CommentItem key={reply.id} comment={reply} isReply={true} />
        ))}
      </View>
    );
  };

  // --- Render Header (Image + Tour Info) ---
  const renderHeader = () => {
    const isTourOwner = currentUser && item && currentUser.id === item.user_id;

    return (
      <View>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image_url }} style={styles.image} />
          
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            {isTourOwner && (
               <View style={{flexDirection:'row', gap:10}}>
                 <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/add-post', params: { item: JSON.stringify(item) } })}>
                   <Ionicons name="pencil" size={20} color="white" />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.iconBtn, {backgroundColor: '#FF3B30'}]} onPress={() => {
                    Alert.alert("Delete Trip", "Confirm?", [{text:"Delete", style:"destructive", onPress: async () => {
                       await supabase.from('tours').delete().eq('id', item.id);
                       router.back();
                    }}, {text:"Cancel"}]);
                 }}>
                   <Ionicons name="trash" size={20} color="white" />
                 </TouchableOpacity>
               </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>{item.price}</Text>
          
          <View style={styles.metaRow}>
              <Text style={styles.metaText}>{item.complexity || 'Moderate'}</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>{item.dates || 'Flexible'}</Text>
          </View>

          <Text style={styles.subtitle}>{item.subtitle}</Text>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Rate this trip</Text>
              <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => handleRate(star)}>
                          <Ionicons name={star <= userRating ? "star" : "star-outline"} size={32} color="#FFD700" />
                      </TouchableOpacity>
                  ))}
              </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            Comments ({comments.length})
          </Text>
        </View>
      </View>
    );
  };

  if (!item) return <SafeAreaView style={styles.container}><ActivityIndicator color="#3E6FFF" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          data={rootComments} // Only render roots, they find their own children
          keyExtractor={(c) => c.id.toString()}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => <CommentItem comment={item} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No comments yet. Be the first!</Text>}
        />

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          {/* Context Bar (Visible when Replying or Editing) */}
          {(replyingTo || editingComment) && (
            <View style={styles.contextBar}>
              <Text style={styles.contextText}>
                {editingComment ? 'Editing comment...' : `Replying to ${replyingTo?.user_name}...`}
              </Text>
              <TouchableOpacity onPress={() => {
                setReplyingTo(null);
                setEditingComment(null);
                setInputText('');
                Keyboard.dismiss();
              }}>
                <Ionicons name="close-circle" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput 
              ref={inputRef}
              style={styles.input} 
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
              placeholderTextColor="#666" 
              value={inputText} 
              onChangeText={setInputText} 
            />
            <TouchableOpacity 
              onPress={handleSubmit} 
              disabled={isSubmitting}
              style={[styles.sendBtn, isSubmitting && { opacity: 0.6 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name={editingComment ? "checkmark" : "send"} size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E141C' },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 300, backgroundColor: '#1C1F2A' },
  
  topControls: { 
    position: 'absolute', top: 20, left: 20, right: 20, 
    flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 
  },
  iconBtn: { 
    backgroundColor: 'rgba(0,0,0,0.6)', width: 40, height: 40, 
    borderRadius: 20, justifyContent: 'center', alignItems: 'center' 
  },

  content: { padding: 20 },
  title: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  price: { color: '#3E6FFF', fontSize: 22, fontWeight: 'bold', marginVertical: 8 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaText: { color: '#888' },
  subtitle: { color: '#ccc', lineHeight: 24, fontSize: 15, marginBottom: 20 },
  
  ratingSection: { 
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1E2A3A', 
    paddingVertical: 16, marginVertical: 10 
  },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 12 },

  // Comment List Styles
  commentContainer: { 
    backgroundColor: '#171E27', padding: 14, marginHorizontal: 20, 
    marginBottom: 12, borderRadius: 12 
  },
  replyContainer: { 
    marginLeft: 40, marginTop: 8, backgroundColor: '#1C222C', 
    borderLeftWidth: 2, borderLeftColor: '#3E6FFF' 
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentUser: { color: '#3E6FFF', fontWeight: 'bold', fontSize: 14 },
  commentTime: { color: '#666', fontSize: 12 },
  commentText: { color: '#E6F0FF', lineHeight: 20, marginBottom: 8 },
  
  commentActions: { flexDirection: 'row', gap: 16 },
  actionText: { color: '#888', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },

  // Input Bar Styles
  inputWrapper: { backgroundColor: '#0E141C', borderTopWidth: 1, borderTopColor: '#1E2A3A' },
  contextBar: { 
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, 
    paddingVertical: 8, backgroundColor: '#151921' 
  },
  contextText: { color: '#3E6FFF', fontSize: 12, fontStyle: 'italic' },
  
  inputRow: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  input: { 
    flex: 1, backgroundColor: '#1C1F2A', color: 'white', borderRadius: 24, 
    paddingHorizontal: 20, paddingVertical: 12, marginRight: 12 
  },
  sendBtn: { 
    backgroundColor: '#3E6FFF', width: 44, height: 44, 
    borderRadius: 22, justifyContent: 'center', alignItems: 'center' 
  }
});