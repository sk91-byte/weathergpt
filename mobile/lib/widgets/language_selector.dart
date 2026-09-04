import 'package:flutter/material.dart';
import '../language_registry.dart';

class LanguageSelector extends StatefulWidget {
  const LanguageSelector({super.key, required this.selectedCode, required this.onSelected});
  final String selectedCode;
  final ValueChanged<AppLanguage> onSelected;

  @override
  State<LanguageSelector> createState() => _LanguageSelectorState();
}

class _LanguageSelectorState extends State<LanguageSelector> {
  final search = TextEditingController();

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = search.text.toLowerCase();
    final values = appLanguages.where((item) => '${item.englishName} ${item.nativeName} ${item.code}'.toLowerCase().contains(query)).toList();
    return Column(
      children: [
        TextField(controller: search, onChanged: (_) => setState(() {}), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search language')),
        const SizedBox(height: 8),
        Expanded(child: ListView(children: values.map((item) => ListTile(onTap: () => widget.onSelected(item), leading: Icon(item.code == widget.selectedCode ? Icons.radio_button_checked : Icons.radio_button_unchecked, color: item.code == widget.selectedCode ? Colors.blue : Colors.grey), title: Text(item.nativeName, style: const TextStyle(fontSize: 17)), subtitle: Text(item.englishName), trailing: Text(item.code))).toList())),
      ],
    );
  }
}
