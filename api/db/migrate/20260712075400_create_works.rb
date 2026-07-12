class CreateWorks < ActiveRecord::Migration[7.2]
  def change
    create_table :works do |t|
      t.references :user, null: false, foreign_key: true
      t.string  :title, null: false
      t.text    :description
      t.string  :tech_stack, array: true, default: []
      t.string  :video_url
      t.string  :thumbnail_url
      t.string  :github_url
      t.string  :demo_url
      t.integer :position
      t.boolean :published, default: false, null: false

      t.timestamps
    end

    add_index :works, :position
  end
end