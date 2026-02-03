# 🤖 Système de Génération de Questions IA

## 📋 Vue d'ensemble

Le système génère automatiquement des questions adaptées au niveau scolaire de l'élève et les enregistre en base de données **avant** le combat, pour une expérience fluide et cohérente.

## 🔄 Flux de fonctionnement

```
1. Parent active le mode IA avec un sujet
   ↓
2. Le système génère 15 questions adaptées au niveau
   ↓
3. Questions enregistrées en base avec difficulté et catégorie
   ↓
4. Durant le combat, questions tirées de la base (comme les autres)
```

## 🎯 Sujets supportés

### ✅ Mathématiques

#### Tables de multiplication
**Exemples de saisie :**
- `table de 7`
- `table de 3`
- `table de multiplication de 9`

**Adapté par niveau :**
- **CP/CE1** : Multiplications jusqu'à 5 (ex: 7×3)
- **CE2+** : Multiplications jusqu'à 10 (ex: 7×9)

**Difficulté automatique :**
- EASY : multiplicateur ≤ 5
- MEDIUM : multiplicateur ≤ 7
- HARD : multiplicateur > 7

---

#### Additions
**Exemples de saisie :**
- `addition`
- `additions simples`

**Adapté par niveau :**
- **CP** : additions jusqu'à 10
- **CE1** : additions jusqu'à 20
- **CE2** : additions jusqu'à 50
- **CM1/CM2** : additions jusqu'à 100

---

#### Soustractions
**Exemples de saisie :**
- `soustraction`
- `soustractions simples`

**Adapté par niveau :** (même logique que additions)

---

### ✅ Anglais

#### Mois de l'année
**Exemples de saisie :**
- `les mois de l'année en anglais`
- `mois anglais`

**Génère 12 questions** (une par mois)

**Exemple de question :**
> Comment dit-on 'Janvier' en anglais ?
> - [ ] February
> - [x] January
> - [ ] March
> - [ ] December

---

#### Jours de la semaine
**Exemples de saisie :**
- `les jours de la semaine en anglais`
- `jours anglais`

**Génère 7 questions** (une par jour)

---

## ⚙️ Configuration par niveau

| Niveau | Maths (plage) | Difficulté vocabulaire |
|--------|---------------|------------------------|
| CP     | 1-10          | EASY                   |
| CE1    | 1-20          | EASY                   |
| CE2    | 1-50          | MEDIUM                 |
| CM1    | 1-100         | MEDIUM                 |
| CM2    | 1-100         | HARD                   |
| 6EME   | 1-100         | HARD                   |

## 🔧 Endpoints API

### Génération manuelle (optionnel)
```http
POST /backend/generate_ai_questions.php
Authorization: Bearer {token}
Content-Type: application/json

{
  "topic": "les mois de l'année en anglais",
  "count": 10
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "10 questions générées et enregistrées",
  "count": 10,
  "grade": "CE1",
  "topic": "les mois de l'année en anglais"
}
```

### Activation automatique via configuration
```http
POST /backend/update_config.php
Authorization: Bearer {token}
Content-Type: application/json

{
  "custom_prompt_active": 1,
  "custom_prompt_text": "table de 7"
}
```

**Comportement :**
- ✅ Met à jour la configuration utilisateur
- ✅ Génère automatiquement 15 questions adaptées
- ✅ Supprime les anciennes questions IA du même niveau
- ✅ Enregistre les nouvelles questions en base

## 📊 Structure en base de données

Les questions IA sont enregistrées dans `question_bank` avec :

```sql
{
  "question_text": "Combien font 7 × 8 ?",
  "options_json": "[\"56\",\"49\",\"55\",\"63\"]",
  "correct_index": 0,
  "explanation": "7 fois 8 est égal à 56.",
  "subject": "MATHS",
  "difficulty": "MEDIUM",
  "category": "Table de 7",
  "grade_level": "CE1",
  "source_override": "IA"
}
```

**Filtrage :** `source_override = 'IA'` permet de distinguer les questions IA des questions pré-définies.

## 🎮 Utilisation pendant le combat

Quand le mode IA est activé :

1. `get_question.php` recherche d'abord les questions avec `source_override = 'IA'`
2. Les questions sont filtrées par `grade_level` de l'utilisateur
3. Évite les doublons via `exclude_ids`
4. Si aucune question IA, fallback sur les questions normales

## 🚀 Comment ajouter un nouveau type de question

Éditer [`/backend/generate_ai_questions.php`](backend/generate_ai_questions.php) :

```php
// Ajouter dans la fonction generateSmartQuestions()

elseif (preg_match('/nouveau_pattern/i', $topic)) {
    // Logique de génération
    for ($i = 0; $i < min($count, 10); $i++) {
        $questions[] = [
            'subject' => 'MATIERE',
            'difficulty' => 'EASY|MEDIUM|HARD',
            'category' => 'Nom catégorie',
            'text' => 'Question ?',
            'options' => ['Rep1', 'Rep2', 'Rep3', 'Rep4'],
            'correct' => 0, // Index de la bonne réponse
            'expl' => 'Explication...'
        ];
    }
}
```

## 🐛 Dépannage

### Les questions ne sont pas générées
1. Vérifier que `custom_prompt_active = 1` dans la table `users`
2. Vérifier le pattern du sujet dans `generate_ai_questions.php`
3. Consulter les logs PHP : `tail -f /var/log/apache2/error.log`

### Questions non adaptées au niveau
1. Vérifier `grade_level` dans la table `users`
2. Ajuster les configurations dans `$gradeConfig` de `generate_ai_questions.php`

### Questions qui se répètent
- Normal ! Le système tire aléatoirement parmi les 15 questions générées
- Pour plus de variété, augmenter le `count` dans `update_config.php` (actuellement 15)

## 📈 Améliorations futures

- [ ] Support GPT/Claude pour génération réelle
- [ ] Plus de sujets (géographie, histoire, sciences)
- [ ] Questions à trous, QCM multiples
- [ ] Images dans les questions
- [ ] Génération adaptative selon performance

---

**Dernière mise à jour :** 3 février 2026
