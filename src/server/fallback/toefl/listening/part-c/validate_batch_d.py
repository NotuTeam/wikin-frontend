import json

with open(r'D:\projects\wikin\frontend\src\server\fallback\toefl\listening\part-c\batch-D.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'Total entries: {len(data)}')
diff_counts = {'EASY': 0, 'MEDIUM': 0, 'HARD': 0}
valid_settings = {'CAFETERIA', 'STUDENT_CENTER', 'CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY'}
valid_qtypes = {'MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE'}
valid_settings_list = valid_settings

for i, e in enumerate(data):
    print(f'\n--- Entry {i} ---')
    print(f'  type: {e["type"]}')
    print(f'  questionText len: {len(e["questionText"])}')
    print(f'  audioScript len: {len(e["audioScript"])}')
    print(f'  audioScript starts with Situation: {e["audioScript"].startswith("Situation:")}')
    print(f'  speakers: {len(e["speakers"])}')
    for s in e["speakers"]:
        print(f'    {s["name"]} / {s["role"]}')
    print(f'  setting: {e["setting"]} (valid: {e["setting"] in valid_settings})')
    print(f'  difficulty: {e["difficulty"]}')
    diff_counts[e["difficulty"]] += 1
    print(f'  questions count: {len(e["questions"])}')
    qnums = []
    for q in e["questions"]:
        qnums.append(q["questionNumber"])
        assert len(q["options"]) == 4, f'Entry {i} Q{q["questionNumber"]}: options count = {len(q["options"])}'
        assert 0 <= q["correctAnswer"] <= 3, f'Entry {i} Q{q["questionNumber"]}: correctAnswer = {q["correctAnswer"]}'
        assert q["questionType"] in valid_qtypes, f'Entry {i} Q{q["questionNumber"]}: questionType = {q["questionType"]}'
        assert len(q["explanation"]) >= 30, f'Entry {i} Q{q["questionNumber"]}: explanation len = {len(q["explanation"])}'
        assert len(q["questionText"]) >= 10, f'Entry {i} Q{q["questionNumber"]}: questionText len = {len(q["questionText"])}'
    print(f'  questionNumbers: {qnums}')
    assert qnums == list(range(1, 11)), f'Entry {i}: question numbers = {qnums}'
    print(f'  keyVocabulary count: {len(e["keyVocabulary"])}')
    assert len(e["keyVocabulary"]) >= 6, f'Entry {i}: keyVocabulary count = {len(e["keyVocabulary"])}'
    assert e["audioScript"].startswith("Situation:"), f'Entry {i}: audioScript does not start with Situation:'
    assert len(e["audioScript"]) >= 500, f'Entry {i}: audioScript too short'
    assert e["type"] == "LISTENING_PART_C", f'Entry {i}: wrong type'
    assert 2 <= len(e["speakers"]) <= 4, f'Entry {i}: speakers count = {len(e["speakers"])}'

print(f'\n--- Difficulty distribution ---')
print(f'EASY: {diff_counts["EASY"]}, MEDIUM: {diff_counts["MEDIUM"]}, HARD: {diff_counts["HARD"]}')
assert diff_counts["EASY"] == 1, f'EASY count = {diff_counts["EASY"]}'
assert diff_counts["MEDIUM"] == 3, f'MEDIUM count = {diff_counts["MEDIUM"]}'
assert diff_counts["HARD"] == 2, f'HARD count = {diff_counts["HARD"]}'

print('\nAll validations passed!')
