import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  SectionList,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const STORAGE_KEY = 'wrong-problem-review/problems/v1';
const DELETE_ACTION_WIDTH = 96;

const REVIEW_PLANS = {
  light: {
    label: '有点不会',
    shortLabel: '轻度',
    steps: [2, 5, 10, 21],
    chipBackground: '#EDF5EE',
    chipText: '#3B6B48',
  },
  medium: {
    label: '比较不会',
    shortLabel: '中度',
    steps: [1, 2, 4, 7, 15],
    chipBackground: '#EAF0FB',
    chipText: '#3F649A',
  },
  hard: {
    label: '完全不会',
    shortLabel: '重度',
    steps: [1, 2, 3, 5, 8, 13, 21],
    chipBackground: '#FBECEC',
    chipText: '#A04F4F',
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseDateKey = (value) => {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : parseDateKey(value);
  const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const year = safeDate.getFullYear();
  const month = `${safeDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${safeDate.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateKey, days) => {
  const nextDate = parseDateKey(dateKey);
  nextDate.setDate(nextDate.getDate() + days);
  return toDateKey(nextDate);
};

const formatDisplayDate = (dateKey) => {
  const date = parseDateKey(dateKey);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}/${day}`;
};

const getReviewPlan = (reviewPlanKey) => REVIEW_PLANS[reviewPlanKey] || REVIEW_PLANS.medium;

const normalizeProblem = (problem) => {
  const reviewPlanKey = REVIEW_PLANS[problem?.reviewPlanKey] ? problem.reviewPlanKey : 'medium';
  const reviewPlan = getReviewPlan(reviewPlanKey);
  const rawStageIndex = Number.isInteger(problem?.stageIndex) ? problem.stageIndex : 0;
  const maxStageIndex = problem?.nextReviewDate ? reviewPlan.steps.length - 1 : reviewPlan.steps.length;
  const stageIndex = clamp(rawStageIndex, 0, Math.max(maxStageIndex, 0));

  return {
    id: problem?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bookName: String(problem?.bookName || '').trim(),
    problemInfo: String(problem?.problemInfo || '').trim(),
    knowledgePoint: String(problem?.knowledgePoint || '').trim(),
    createdAt: problem?.createdAt || toDateKey(),
    reviewPlanKey,
    stageIndex,
    nextReviewDate: problem?.nextReviewDate || null,
    reviewHistory: Array.isArray(problem?.reviewHistory) ? problem.reviewHistory : [],
    completedAt: problem?.completedAt || null,
  };
};

const getStageLabel = (problem) => {
  const reviewPlan = getReviewPlan(problem.reviewPlanKey);

  if (!problem.nextReviewDate) {
    return '全部完成';
  }

  return `第 ${problem.stageIndex + 1} / ${reviewPlan.steps.length} 轮`;
};

const getStatusLabel = (problem, todayKey) => {
  if (!problem.nextReviewDate) {
    return '已完成';
  }

  if (problem.nextReviewDate <= todayKey) {
    return '待复习';
  }

  return `下次 ${formatDisplayDate(problem.nextReviewDate)}`;
};

const sortProblems = (problems) => {
  return [...problems].sort((left, right) => {
    const leftDate = left.nextReviewDate || '9999-12-31';
    const rightDate = right.nextReviewDate || '9999-12-31';

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    if (left.bookName !== right.bookName) {
      return left.bookName.localeCompare(right.bookName, 'zh-Hans-CN');
    }

    return left.problemInfo.localeCompare(right.problemInfo, 'zh-Hans-CN');
  });
};

function LogoMark() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoOuterCircle}>
        <View style={styles.logoInnerCircle}>
          <Text style={styles.logoText}>错</Text>
        </View>
      </View>
      <View style={styles.logoAccent} />
    </View>
  );
}

function SwipeableRow({ children, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(false);

  const closeRow = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      isOpenRef.current = false;
    });
  };

  const openRow = () => {
    Animated.spring(translateX, {
      toValue: -DELETE_ACTION_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      isOpenRef.current = true;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isOpenRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 8;
      },
      onPanResponderMove: (_, gestureState) => {
        const offset = isOpenRef.current ? -DELETE_ACTION_WIDTH : 0;
        translateX.setValue(clamp(offset + gestureState.dx, -DELETE_ACTION_WIDTH, 0));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldOpen = gestureState.dx < -48 || (isOpenRef.current && gestureState.dx < 36);

        if (shouldOpen) {
          openRow();
        } else {
          closeRow();
        }
      },
      onPanResponderTerminate: closeRow,
    })
  ).current;

  return (
    <View style={styles.swipeShell}>
      <View style={styles.deleteActionWrap}>
        <Pressable onPress={onDelete} style={styles.deleteActionButton}>
          <Text style={styles.deleteActionText}>删除</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.swipeCardWrap, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function ProblemCard({ problem, todayKey, onDone, showDoneButton = false, doneDisabled = false }) {
  const reviewPlan = getReviewPlan(problem.reviewPlanKey);

  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{problem.bookName}</Text>
        <Text style={styles.cardSubtitle}>{problem.problemInfo}</Text>

        {problem.knowledgePoint ? (
          <Text style={styles.knowledgeText}>知识点：{problem.knowledgePoint}</Text>
        ) : null}

        <View style={styles.tagRow}>
          <View style={[styles.tagChip, { backgroundColor: reviewPlan.chipBackground }]}>
            <Text style={[styles.tagChipText, { color: reviewPlan.chipText }]}>{reviewPlan.label}</Text>
          </View>
          <View style={styles.tagChipNeutral}>
            <Text style={styles.tagChipNeutralText}>{getStageLabel(problem)}</Text>
          </View>
          <View style={styles.tagChipNeutral}>
            <Text style={styles.tagChipNeutralText}>{getStatusLabel(problem, todayKey)}</Text>
          </View>
        </View>
      </View>

      {showDoneButton ? (
        <Pressable
          onPress={() => onDone(problem.id)}
          style={[styles.doneButton, doneDisabled && styles.doneButtonDisabled]}
          disabled={doneDisabled}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function App() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [modalVisible, setModalVisible] = useState(false);
  const [bookName, setBookName] = useState('');
  const [problemInfo, setProblemInfo] = useState('');
  const [knowledgePoint, setKnowledgePoint] = useState('');
  const [reviewPlanKey, setReviewPlanKey] = useState('medium');
  const [todayKey, setTodayKey] = useState(() => toDateKey());
  const [isPersisting, setIsPersisting] = useState(false);
  const [pendingDoneIds, setPendingDoneIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const problemsRef = useRef([]);
  const persistQueueRef = useRef(Promise.resolve());
  const pendingPersistCountRef = useRef(0);
  const pendingDoneIdsRef = useRef(new Set());

  const topInset = Platform.OS === 'android' ? (NativeStatusBar.currentHeight || 0) + 10 : 14;

  useEffect(() => {
    problemsRef.current = problems;
  }, [problems]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTodayKey((currentTodayKey) => {
        const nextTodayKey = toDateKey();
        return currentTodayKey === nextTodayKey ? currentTodayKey : nextTodayKey;
      });
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadProblems = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

        if (storedValue) {
          let parsedValue;

          try {
            parsedValue = JSON.parse(storedValue);
          } catch (parseError) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            problemsRef.current = [];
            setProblems([]);
            Alert.alert('本地数据已损坏', '已清空无法读取的本地数据，你可以继续使用 App。');
            return;
          }

          const normalizedProblems = Array.isArray(parsedValue)
            ? parsedValue.map((problem) => normalizeProblem(problem))
            : [];

          const sortedProblems = sortProblems(normalizedProblems);
          problemsRef.current = sortedProblems;
          setProblems(sortedProblems);
        }
      } catch (error) {
        Alert.alert('读取失败', '本地数据读取失败，请重新打开 App 再试一次。');
      } finally {
        setLoading(false);
      }
    };

    loadProblems();
  }, []);

  const persistProblems = async (updater) => {
    pendingPersistCountRef.current += 1;
    setIsPersisting(true);

    const persistTask = persistQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const currentProblems = problemsRef.current;
        const nextProblemList = typeof updater === 'function' ? updater(currentProblems) : updater;
        const normalizedProblems = nextProblemList.map((problem) => normalizeProblem(problem));
        const sortedProblems = sortProblems(normalizedProblems);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortedProblems));

        problemsRef.current = sortedProblems;
        setProblems(sortedProblems);

        return sortedProblems;
      });

    persistQueueRef.current = persistTask.finally(() => {
      pendingPersistCountRef.current = Math.max(0, pendingPersistCountRef.current - 1);
      setIsPersisting(pendingPersistCountRef.current > 0);
    });

    return persistTask;
  };

  const todayProblems = useMemo(() => {
    return problems.filter((problem) => problem.nextReviewDate && problem.nextReviewDate <= todayKey);
  }, [problems, todayKey]);

  const groupedProblems = useMemo(() => {
    const groups = problems.reduce((result, problem) => {
      const groupKey = problem.bookName || '未命名资料';

      if (!result[groupKey]) {
        result[groupKey] = [];
      }

      result[groupKey].push(problem);
      return result;
    }, {});

    return Object.keys(groups)
      .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
      .map((title) => ({
        title,
        data: groups[title],
      }));
  }, [problems]);

  const completedCount = useMemo(() => problems.filter((problem) => !problem.nextReviewDate).length, [problems]);

  const resetForm = () => {
    setBookName('');
    setProblemInfo('');
    setKnowledgePoint('');
    setReviewPlanKey('medium');
  };

  const closeModal = () => {
    resetForm();
    setModalVisible(false);
  };

  const handleSave = async () => {
    const trimmedBookName = bookName.trim();
    const trimmedProblemInfo = problemInfo.trim();
    const trimmedKnowledgePoint = knowledgePoint.trim();

    if (!trimmedBookName || !trimmedProblemInfo) {
      Alert.alert('信息不完整', '请先填写书名/资料名，以及页码或题号。');
      return;
    }

    const reviewPlan = getReviewPlan(reviewPlanKey);
    setSaving(true);

    try {
      const createdAt = todayKey;
      await persistProblems((currentProblems) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          bookName: trimmedBookName,
          problemInfo: trimmedProblemInfo,
          knowledgePoint: trimmedKnowledgePoint,
          createdAt,
          reviewPlanKey,
          stageIndex: 0,
          nextReviewDate: addDays(createdAt, reviewPlan.steps[0]),
          reviewHistory: [],
          completedAt: null,
        },
        ...currentProblems,
      ]);
      closeModal();
    } catch (error) {
      Alert.alert('保存失败', '本地保存失败，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = async (problemId) => {
    if (pendingDoneIdsRef.current.has(problemId)) {
      return;
    }

    pendingDoneIdsRef.current.add(problemId);
    setPendingDoneIds((currentIds) => [...currentIds, problemId]);

    try {
      await persistProblems((currentProblems) =>
        currentProblems.map((problem) => {
          if (problem.id !== problemId) {
            return problem;
          }

          const reviewPlan = getReviewPlan(problem.reviewPlanKey);
          const nextStageIndex = problem.stageIndex + 1;
          const reviewHistory = [...(problem.reviewHistory || []), todayKey];

          if (nextStageIndex >= reviewPlan.steps.length) {
            return {
              ...problem,
              stageIndex: nextStageIndex,
              nextReviewDate: null,
              reviewHistory,
              completedAt: todayKey,
            };
          }

          return {
            ...problem,
            stageIndex: nextStageIndex,
            nextReviewDate: addDays(todayKey, reviewPlan.steps[nextStageIndex]),
            reviewHistory,
          };
        })
      );
    } catch (error) {
      Alert.alert('更新失败', '复习状态没有保存成功，请再点一次。');
    } finally {
      pendingDoneIdsRef.current.delete(problemId);
      setPendingDoneIds((currentIds) => currentIds.filter((currentId) => currentId !== problemId));
    }
  };

  const handleDelete = (problemId) => {
    Alert.alert('删除这道题？', '删除后不会恢复，确定继续吗？', [
      {
        text: '取消',
        style: 'cancel',
      },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await persistProblems((currentProblems) => currentProblems.filter((problem) => problem.id !== problemId));
          } catch (error) {
            Alert.alert('删除失败', '这道题暂时没有删掉，请再试一次。');
          }
        },
      },
    ]);
  };

  const currentPlan = getReviewPlan(reviewPlanKey);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={[styles.screen, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <LogoMark />
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>错题复习提醒</Text>
              <Text style={styles.subtitle}>记位置、记知识点，再按不会程度安排复习。</Text>
            </View>
          </View>

          <Pressable onPress={() => setModalVisible(true)} style={styles.headerAddButton} disabled={isPersisting}>
            <Text style={styles.headerAddButtonText}>+ 新增</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{todayProblems.length}</Text>
            <Text style={styles.summaryLabel}>今天待复习</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{problems.length}</Text>
            <Text style={styles.summaryLabel}>全部错题</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>已完成</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('today')}
            style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === 'today' && styles.tabButtonTextActive]}>今天复习</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('all')}
            style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>全部错题</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#4A7C59" />
            <Text style={styles.loadingText}>正在读取本地数据...</Text>
          </View>
        ) : activeTab === 'today' ? (
          <FlatList
            data={todayProblems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, todayProblems.length === 0 && styles.emptyListContent]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ProblemCard
                problem={item}
                todayKey={todayKey}
                onDone={handleDone}
                showDoneButton
                doneDisabled={isPersisting || pendingDoneIds.includes(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>今天没有待复习题目</Text>
                <Text style={styles.emptyText}>去继续刷题吧。新增错题后，App 会按你的不会程度自动安排提醒。</Text>
              </View>
            }
          />
        ) : (
          <SectionList
            sections={groupedProblems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, problems.length === 0 && styles.emptyListContent]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length} 题</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <SwipeableRow onDelete={() => handleDelete(item.id)}>
                <ProblemCard problem={item} todayKey={todayKey} />
              </SwipeableRow>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>还没有错题记录</Text>
                <Text style={styles.emptyText}>点右上角“新增”，录入书名、页码和知识点就可以开始。</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            style={styles.modalKeyboardWrap}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>新增错题</Text>
                <Pressable onPress={closeModal}>
                  <Text style={styles.modalCloseText}>关闭</Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>书名 / 资料名</Text>
                  <TextInput
                    value={bookName}
                    onChangeText={setBookName}
                    placeholder="例如：高数上册"
                    placeholderTextColor="#90A099"
                    style={styles.input}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>页码 / 题号</Text>
                  <TextInput
                    value={problemInfo}
                    onChangeText={setProblemInfo}
                    placeholder="例如：P38 第 12 题"
                    placeholderTextColor="#90A099"
                    style={styles.input}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>知识点备注（可选）</Text>
                  <TextInput
                    value={knowledgePoint}
                    onChangeText={setKnowledgePoint}
                    placeholder="例如：三角换元、导数几何意义"
                    placeholderTextColor="#90A099"
                    style={[styles.input, styles.multilineInput]}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>不会程度</Text>
                  <View style={styles.levelList}>
                    {Object.entries(REVIEW_PLANS).map(([key, plan]) => {
                      const selected = reviewPlanKey === key;

                      return (
                        <Pressable
                          key={key}
                          onPress={() => setReviewPlanKey(key)}
                          style={[styles.levelCard, selected && styles.levelCardSelected]}
                        >
                          <View style={styles.levelCardTopRow}>
                            <Text style={[styles.levelCardTitle, selected && styles.levelCardTitleSelected]}>{plan.label}</Text>
                            <View style={[styles.levelDot, selected && styles.levelDotSelected]} />
                          </View>
                          <Text style={styles.levelCardText}>复习节奏：{plan.steps.join(' / ')} 天</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.planPreviewBox}>
                  <Text style={styles.planPreviewTitle}>当前方案</Text>
                  <Text style={styles.planPreviewText}>
                    {currentPlan.label}：将在录入后的第 {currentPlan.steps.join('、')} 天安排复习。
                  </Text>
                </View>

                <Text style={styles.helperText}>保存后会自动记录今天为录入日，并按你选择的程度安排下一次复习。</Text>

                <Pressable
                  onPress={handleSave}
                  style={[styles.saveButton, (saving || isPersisting) && styles.saveButtonDisabled]}
                  disabled={saving || isPersisting}
                >
                  <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存这道错题'}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8F4',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
  },
  headerTextWrap: {
    flex: 1,
  },
  logoWrap: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOuterCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4A7C59',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#17301F',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  logoInnerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#355A41',
  },
  logoAccent: {
    position: 'absolute',
    right: 4,
    bottom: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F2BE5C',
    borderWidth: 2,
    borderColor: '#F5F8F4',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#20302A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: '#60716A',
  },
  headerAddButton: {
    backgroundColor: '#4A7C59',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  headerAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    shadowColor: '#17301F',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#20302A',
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 13,
    color: '#6C7A74',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E8EFE8',
    padding: 5,
    borderRadius: 18,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#62726C',
  },
  tabButtonTextActive: {
    color: '#20302A',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#60716A',
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#20302A',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: '#667771',
    textAlign: 'center',
  },
  swipeShell: {
    marginBottom: 12,
  },
  deleteActionWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DELETE_ACTION_WIDTH,
    borderRadius: 22,
    overflow: 'hidden',
  },
  deleteActionButton: {
    flex: 1,
    backgroundColor: '#D95C54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  swipeCardWrap: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#17301F',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#20302A',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: '#4E5E58',
  },
  knowledgeText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#667771',
  },
  tagRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagChipNeutral: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F4F1',
  },
  tagChipNeutralText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667771',
  },
  doneButton: {
    backgroundColor: '#E4F0E7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#356344',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#30413B',
  },
  sectionCount: {
    fontSize: 13,
    color: '#71807A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 33, 27, 0.28)',
    justifyContent: 'flex-end',
  },
  modalKeyboardWrap: {
    width: '100%',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D6DED7',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#20302A',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#60716A',
    fontWeight: '600',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B4B45',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F4F7F3',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: '#20302A',
  },
  multilineInput: {
    minHeight: 92,
  },
  levelList: {
    gap: 10,
  },
  levelCard: {
    borderRadius: 18,
    backgroundColor: '#F7F9F6',
    borderWidth: 1,
    borderColor: '#E1E8E2',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  levelCardSelected: {
    borderColor: '#4A7C59',
    backgroundColor: '#EDF5EE',
  },
  levelCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#30413B',
  },
  levelCardTitleSelected: {
    color: '#264B31',
  },
  levelCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#677771',
  },
  levelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#B8C4BA',
  },
  levelDotSelected: {
    backgroundColor: '#4A7C59',
    borderColor: '#4A7C59',
  },
  planPreviewBox: {
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#F5F8F4',
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  planPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30413B',
    marginBottom: 6,
  },
  planPreviewText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5F716A',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6C7A74',
    marginBottom: 18,
  },
  saveButton: {
    backgroundColor: '#4A7C59',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
